'use strict';

const { Op, sequelize } = require('sequelize');
const {
  ProductPromotion,
  PromotionMenuItem,
  PromotionRedemption,
  PromotionRule,
  ProductCategory,
  Customer,
  MenuInventory,
} = require('@models');
const mtablesConstants = require('@constants/mtablesConstants');

async function redeemPromotion({ customerId, promotionId, orderId, couponCode, transaction }) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  const promotion = await ProductPromotion.findByPk(promotionId, {
    include: [
      { model: PromotionMenuItem, as: 'menuItems', include: [{ model: MenuInventory, as: 'menuItem' }] },
      { model: PromotionRule, as: 'rules' },
    ],
    transaction,
  });
  if (!promotion || !promotion.is_active) throw new Error('Promotion not available');

  if (!mtablesConstants.DISCOUNT_TYPES.includes(promotion.type)) {
    throw new Error('Invalid promotion type');
  }

  const order = await sequelize.models.InDiningOrder.findByPk(orderId, {
    include: [{ model: sequelize.models.OrderItems, as: 'items', include: [{ model: MenuInventory, as: 'menuItem' }] }],
    transaction,
  });
  if (!order || order.customer_id !== customerId) throw new Error('Invalid order');

  if (promotion.coupon_code && promotion.coupon_code !== couponCode) {
    throw new Error('Invalid coupon code');
  }

  const redemptionCount = await PromotionRedemption.count({
    where: { customer_id: customerId, promotion_id: promotionId },
    transaction,
  });
  if (redemptionCount >= mtablesConstants.PROMOTION_SETTINGS.MAX_REDEMPTIONS_PER_CUSTOMER) {
    throw new Error('Redemption limit reached');
  }

  for (const rule of promotion.rules) {
    if (!mtablesConstants.PROMOTION_SETTINGS.RULE_TYPES.includes(rule.rule_type)) {
      throw new Error('Invalid promotion rule');
    }

    if (rule.rule_type === 'product_quantity') {
      const requiredQuantity = rule.conditions.min_quantity;
      const eligibleItems = order.items.filter(item =>
        promotion.menuItems.some(pm => pm.menu_item_id === item.menu_item_id)
      );
      const totalQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity < requiredQuantity) {
        throw new Error('Order does not meet promotion requirements');
      }
    } else if (rule.rule_type === 'category') {
      const categoryId = rule.conditions.category_id;
      const category = await ProductCategory.findByPk(categoryId, { transaction });
      if (!category) throw new Error('Invalid category');
      const hasCategoryItem = order.items.some(item => item.menuItem.category_id === categoryId);
      if (!hasCategoryItem) throw new Error('Order does not include required category');
    } else if (rule.rule_type === 'customer_type') {
      const requiredType = rule.conditions.customer_type;
      if (requiredType !== 'all' && requiredType !== customer.customer_type) {
        throw new Error('Customer not eligible for promotion');
      }
    }
  }

  let discountAmount = 0;
  if (promotion.type === 'percentage') {
    const eligibleItemsTotal = order.items
      .filter(item => promotion.menuItems.some(pm => pm.menu_item_id === item.menu_item_id))
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    discountAmount = (promotion.value / 100) * eligibleItemsTotal;
  } else if (promotion.type === 'flat') {
    discountAmount = promotion.value;
  }

  if (discountAmount < mtablesConstants.PROMOTION_SETTINGS.MIN_DISCOUNT_AMOUNT) {
    throw new Error('Invalid discount amount');
  }

  const redemption = await PromotionRedemption.create(
    {
      promotion_id: promotionId,
      order_id: orderId,
      customer_id: customerId,
      discount_amount: discountAmount,
      promotion_code: couponCode || null,
      redeemed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  return redemption;
}

async function getAvailablePromotions({ customerId, transaction }) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  const promotions = await ProductPromotion.findAll({
    where: {
      is_active: true,
      start_date: { [Op.lte]: new Date() },
      end_date: { [Op.gte]: new Date() },
    },
    include: [
      {
        model: PromotionMenuItem,
        as: 'menuItems',
        include: [{ model: MenuInventory, as: 'menuItem', include: [{ model: sequelize.models.ProductAttribute, as: 'attributes' }] }],
      },
      { model: PromotionRule, as: 'rules' },
    ],
    transaction,
  });

  const eligiblePromotions = [];
  for (const promotion of promotions) {
    let isEligible = true;
    for (const rule of promotion.rules) {
      if (rule.rule_type === 'customer_type') {
        const requiredType = rule.conditions.customer_type;
        if (requiredType !== 'all' && requiredType !== customer.customer_type) {
          isEligible = false;
          break;
        }
      } else if (rule.rule_type === 'loyalty_points') {
        const requiredPoints = rule.conditions.min_points;
        const customerPoints = await sequelize.models.Points.sum('points', {
          where: { user_id: customer.user_id },
          transaction,
        });
        if (customerPoints < requiredPoints) {
          isEligible = false;
          break;
        }
      }
    }

    const redemptionCount = await PromotionRedemption.count({
      where: { customer_id: customerId, promotion_id: promotion.id },
      transaction,
    });
    if (redemptionCount >= mtablesConstants.PROMOTION_SETTINGS.MAX_REDEMPTIONS_PER_CUSTOMER) {
      isEligible = false;
    }

    if (isEligible) {
      eligiblePromotions.push(promotion);
    }
  }

  return eligiblePromotions;
}

async function analyzePromotionEngagement({ customerId, transaction }) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  const redemptions = await PromotionRedemption.findAll({
    where: { customer_id: customerId },
    include: [
      { model: ProductPromotion, as: 'promotion' },
      { model: sequelize.models.InDiningOrder, as: 'order' },
    ],
    transaction,
  });

  const metrics = {
    totalRedemptions: redemptions.length,
    totalDiscountAmount: redemptions.reduce((sum, r) => sum + parseFloat(r.discount_amount), 0),
    promotionTypes: [...new Set(redemptions.map(r => r.promotion.type))],
    lastRedemption: redemptions.length > 0 ? redemptions[0].redeemed_at : null,
  };

  return metrics;
}

module.exports = {
  redeemPromotion,
  getAvailablePromotions,
  analyzePromotionEngagement,
};