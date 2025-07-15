'use strict';

const { MenuInventory, ProductPromotion, PromotionMenuItem, ProductDiscount, PromotionRule, ProductAuditLog, MenuVersion, Merchant } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

// Map merchant types to their respective constants
const MERCHANT_TYPE_CONSTANTS = {
  restaurant: restaurantConstants,
  parking_lot: parkingLotConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function applyDynamicPricing(menuId, promotion, ipAddress, transaction = null) {
  try {
    if (!menuId || !promotion?.type || !promotion?.value) {
      throw new AppError('Invalid promotion', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const menuItem = await MenuInventory.findByPk(menuId, { transaction });
    if (!menuItem) {
      throw new AppError('Menu item not found', 404, merchantConstants.ERROR_CODES.INVALID_REQUEST);
    }

    const merchant = await Merchant.findByPk(menuItem.merchant_id, {
      attributes: ['id', 'user_id', 'preferred_language', 'type'],
      transaction,
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    // Parse merchant types
    const merchantTypes = Array.isArray(merchant.type) ? merchant.type : [merchant.type];

    // Validate promotion types
    const allowedPromotionTypes = new Set(munchConstants.PROMOTION_TYPES);
    if (merchantTypes.includes('parking_lot')) {
      mparkConstants.PAYMENT_CONFIG.PRICING_SETTINGS.DISCOUNT_TYPES.forEach((t) => allowedPromotionTypes.add(t));
    }
    for (const type of merchantTypes) {
      const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
      (constants.MPARK_CONSTANTS?.PRICING_SETTINGS?.DISCOUNT_TYPES || []).forEach((t) => allowedPromotionTypes.add(t));
      mtablesConstants.DISCOUNT_TYPES.forEach((t) => allowedPromotionTypes.add(t));
    }
    if (!allowedPromotionTypes.has(promotion.type)) {
      throw new AppError('Invalid promotion type', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    // Validate promotion value for percentage discounts
    if (promotion.type === 'percentage' || promotion.type === 'PERCENTAGE') {
      let maxDiscountPercentage = Infinity;
      for (const type of merchantTypes) {
        const constants = MERCHANT_TYPE_CONSTANTS[type] || merchantConstants;
        maxDiscountPercentage = Math.min(
          maxDiscountPercentage,
          constants.MPARK_CONSTANTS?.PRICING_SETTINGS?.MAX_DISCOUNT_PERCENTAGE ||
            constants.RESTAURANT_CONFIG?.SERVICE_SETTINGS?.MAX_DISCOUNT_PERCENTAGE ||
            mparkConstants.PAYMENT_CONFIG.PRICING_SETTINGS.MAX_DISCOUNT_PERCENTAGE ||
            100
        );
      }
      if (promotion.value > maxDiscountPercentage) {
        throw new AppError('Invalid promotion value', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }
    }

    const productPromotion = await ProductPromotion.create(
      {
        merchant_id: menuItem.merchant_id,
        name: promotion.name || `Promo for ${menuItem.name}`,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
        code: promotion.code,
        start_date: promotion.startDate,
        end_date: promotion.endDate,
        min_purchase_amount: promotion.minPurchaseAmount || munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.MIN_ORDER_AMOUNT || 2,
        usage_limit: promotion.usageLimit,
        customer_eligibility: promotion.customerEligibility || 'all',
        is_active: true,
        is_flash_sale: promotion.type === 'flash_sale',
        created_by: merchant.user_id,
      },
      { transaction }
    );

    await PromotionMenuItem.create(
      {
        promotion_id: productPromotion.id,
        menu_item_id: menuId,
      },
      { transaction }
    );

    await ProductDiscount.create(
      {
        menu_item_id: menuId,
        merchant_id: menuItem.merchant_id,
        type: promotion.type === 'percentage' ? 'percentage' : promotion.type === 'fixed_amount' ? 'flat' : promotion.type,
        value: promotion.value,
        name: promotion.name || `Discount for ${menuItem.name}`,
        description: promotion.description,
        start_date: promotion.startDate,
        end_date: promotion.endDate,
        min_quantity: promotion.minQuantity || mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || 1,
        max_quantity: promotion.maxQuantity || mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM || 30,
        min_order_amount: promotion.minOrderAmount || munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.MIN_ORDER_AMOUNT || 2,
        customer_type: promotion.customerEligibility || 'all',
        coupon_code: promotion.couponCode,
        is_active: true,
        created_by: merchant.user_id,
      },
      { transaction }
    );

    // Create promotion rules if provided
    if (promotion.rules) {
      await PromotionRule.bulkCreate(
        promotion.rules.map((rule, index) => ({
          promotion_id: productPromotion.id,
          rule_type: rule.ruleType,
          conditions: rule.conditions,
          priority: rule.priority || index + 1,
        })),
        { transaction }
      );
    }

    // Create menu version snapshot
    const latestVersion = await MenuVersion.findOne({
      where: { merchant_id: menuItem.merchant_id, branch_id: menuItem.branch_id || null },
      order: [['version_number', 'DESC']],
      transaction,
    });

    await MenuVersion.create(
      {
        merchant_id: menuItem.merchant_id,
        branch_id: menuItem.branch_id,
        version_number: latestVersion ? latestVersion.version_number + 1 : 1,
        menu_data: {
          item: {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            category_id: menuItem.category_id,
            branch_id: menuItem.branch_id,
            availability_status: menuItem.availability_status,
            is_published: menuItem.is_published,
            quantity: menuItem.quantity,
            minimum_stock_level: menuItem.minimum_stock_level,
            space_type: menuItem.space_type,
            security_features: menuItem.security_features,
            access_type: menuItem.access_type,
            egress_type: menuItem.egress_type,
            promotion: {
              id: productPromotion.id,
              name: productPromotion.name,
              type: productPromotion.type,
              value: productPromotion.value,
            },
          },
        },
        description: `Promotion applied for ${merchantTypes.join(', ')}`,
        created_by: merchant.user_id,
      },
      { transaction }
    );

    await ProductAuditLog.create(
      {
        menu_item_id: menuId,
        user_id: merchant.user_id,
        action: 'apply_promotion',
        changes: {
          promotionId: productPromotion.id,
          type: promotion.type,
          value: promotion.value,
          rules: promotion.rules || [],
          code: promotion.code,
          minQuantity: promotion.minQuantity,
          maxQuantity: promotion.maxQuantity,
          minOrderAmount: promotion.minOrderAmount,
        },
      },
      { transaction }
    );

    logger.info(`Dynamic pricing applied for ${merchantTypes.join(', ')}: menu ${menuId}`);
    return {
      menuId,
      promotionId: productPromotion.id,
      merchantId: menuItem.merchant_id,
      promotionType: promotion.type,
      language: merchant.preferred_language || 'en',
      action: 'dynamicPricingApplied',
    };
  } catch (error) {
    throw handleServiceError('applyDynamicPricing', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { applyDynamicPricing };