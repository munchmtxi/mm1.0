'use strict';

/**
 * menuManagementService.js
 * Manages menu creation, updates, dynamic pricing, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const {
  MenuInventory,
  ProductCategory,
  ProductDiscount,
  ProductPromotion,
  PromotionMenuItem,
  Customer,
  Merchant,
  GamificationPoints,
  AuditLog,
  Notification,
  ProductModifier,
  ProductAttribute,
  ProductAuditLog,
  Media,
} = require('@models');

/**
 * Designs menus with categories for a restaurant.
 * @param {number} restaurantId - Merchant ID.
 * @param {Object} menuData - Menu details (items, categories).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created menu.
 */
async function createMenu(restaurantId, menuData, io) {
  try {
    if (!restaurantId || !menuData?.items || !menuData?.categories) {
      throw new Error('Restaurant ID, items, and categories required');
    }

    const merchant = await Merchant.findByPk(restaurantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const categories = await ProductCategory.bulkCreate(
      menuData.categories.map((cat) => ({
        merchant_id: restaurantId,
        name: cat.name,
        description: cat.description,
        parent_id: cat.parentId,
        is_active: true,
        created_by: merchant.user_id,
      })),
      { returning: true }
    );

    const items = await MenuInventory.bulkCreate(
      menuData.items.map((item) => ({
        merchant_id: restaurantId,
        branch_id: item.branchId,
        category_id: categories.find((c) => c.name === item.category)?.id,
        name: item.name,
        description: item.description,
        price: item.price,
        availability_status: item.availabilityStatus || 'in-stock',
        is_published: item.isPublished || false,
        created_by: merchant.user_id,
      })),
      { returning: true }
    );

    if (menuData.images) {
      await Media.bulkCreate(
        menuData.images.map((img) => ({
          merchant_id: restaurantId,
          type: 'menu_photos',
          url: img.url,
          title: img.title,
        }))
      );
    }

    if (menuData.modifiers) {
      await ProductModifier.bulkCreate(
        menuData.modifiers.map((mod) => ({
          menu_item_id: items.find((i) => i.name === mod.itemName)?.id,
          type: mod.type,
          name: mod.name,
          price_adjustment: mod.priceAdjustment,
          is_required: mod.isRequired,
        }))
      );
    }

    if (menuData.attributes) {
      await ProductAttribute.bulkCreate(
        menuData.attributes.map((attr) => ({
          menu_item_id: items.find((i) => i.name === attr.itemName)?.id,
          type: attr.type,
          value: attr.value,
        }))
      );
    }

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'create_menu',
      details: { restaurantId, itemCount: items.length, categoryCount: categories.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'menu:menuCreated', {
      restaurantId,
      menuId: items[0]?.id,
      itemCount: items.length,
    }, `merchant:${restaurantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'menu_created',
      messageKey: 'menu.menu_created',
      messageParams: { itemCount: items.length },
      role: 'merchant',
      module: 'menu',
      languageCode: merchant.preferred_language || 'en',
    });

    return { categories, items };
  } catch (error) {
    logger.error('Error creating menu', { error: error.message });
    throw error;
  }
}

/**
 * Modifies menu items or prices.
 * @param {number} menuId - Menu item ID.
 * @param {Object} updates - Update details (name, price, categoryId, etc.).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated menu item.
 */
async function updateMenu(menuId, updates, io) {
  try {
    if (!menuId || !updates) throw new Error('Menu ID and updates required');

    const menuItem = await MenuInventory.findByPk(menuId);
    if (!menuItem) throw new Error('Menu item not found');

    const merchant = await Merchant.findByPk(menuItem.merchant_id);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    await menuItem.update({
      name: updates.name || menuItem.name,
      price: updates.price || menuItem.price,
      category_id: updates.categoryId || menuItem.category_id,
      description: updates.description || menuItem.description,
      availability_status: updates.availabilityStatus || menuItem.availability_status,
      is_published: updates.isPublished !== undefined ? updates.isPublished : menuItem.is_published,
      updated_by: merchant.user_id,
    });

    if (updates.modifiers) {
      await ProductModifier.destroy({ where: { menu_item_id: menuId } });
      await ProductModifier.bulkCreate(
        updates.modifiers.map((mod) => ({
          menu_item_id: menuId,
          type: mod.type,
          name: mod.name,
          price_adjustment: mod.priceAdjustment,
          is_required: mod.isRequired,
        }))
      );
    }

    if (updates.attributes) {
      await ProductAttribute.destroy({ where: { menu_item_id: menuId } });
      await ProductAttribute.bulkCreate(
        updates.attributes.map((attr) => ({
          menu_item_id: menuId,
          type: attr.type,
          value: attr.value,
        }))
      );
    }

    await ProductAuditLog.create({
      menu_item_id: menuId,
      user_id: merchant.user_id,
      action: 'update',
      changes: updates,
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'update_menu',
      details: { menuId, updates },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'menu:menuUpdated', {
      menuId,
      restaurantId: menuItem.merchant_id,
    }, `merchant:${menuItem.merchant_id}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'menu_updated',
      messageKey: 'menu.menu_updated',
      messageParams: { itemName: menuItem.name },
      role: 'merchant',
      module: 'menu',
      languageCode: merchant.preferred_language || 'en',
    });

    return menuItem;
  } catch (error) {
    logger.error('Error updating menu', { error: error.message });
    throw error;
  }
}

/**
 * Sets promotional pricing for a menu item.
 * @param {number} menuId - Menu item ID.
 * @param {Object} promotion - Promotion details (type, value, startDate, endDate).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Promotion record.
 */
async function applyDynamicPricing(menuId, promotion, io) {
  try {
    if (!menuId || !promotion?.type || !promotion?.value) {
      throw new Error('Menu ID, promotion type, and value required');
    }

    const menuItem = await MenuInventory.findByPk(menuId);
    if (!menuItem) throw new Error('Menu item not found');

    const merchant = await Merchant.findByPk(menuItem.merchant_id);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'];
    if (!validTypes.includes(promotion.type)) throw new Error('Invalid promotion type');

    const productPromotion = await ProductPromotion.create({
      merchant_id: menuItem.merchant_id,
      name: promotion.name || `Promo for ${menuItem.name}`,
      type: promotion.type,
      value: promotion.value,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      min_purchase_amount: promotion.minPurchaseAmount || 0,
      customer_eligibility: promotion.customerEligibility || 'all',
      is_active: true,
      created_by: merchant.user_id,
    });

    await PromotionMenuItem.create({
      promotion_id: productPromotion.id,
      menu_item_id: menuId,
    });

    await ProductDiscount.create({
      menu_item_id: menuId,
      merchant_id: menuItem.merchant_id,
      type: promotion.type === 'percentage' ? 'percentage' : 'flat',
      value: promotion.value,
      name: promotion.name || `Discount for ${menuItem.name}`,
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      is_active: true,
      created_by: merchant.user_id,
    });

    await ProductAuditLog.create({
      menu_item_id: menuId,
      user_id: merchant.user_id,
      action: 'apply_promotion',
      changes: { promotionId: productPromotion.id, type: promotion.type, value: promotion.value },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'apply_dynamic_pricing',
      details: { menuId, promotion },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'menu:dynamicPricingApplied', {
      menuId,
      promotionId: productPromotion.id,
      restaurantId: menuItem.merchant_id,
    }, `merchant:${menuItem.merchant_id}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'dynamic_pricing_applied',
      messageKey: 'menu.dynamic_pricing_applied',
      messageParams: { itemName: menuItem.name },
      role: 'merchant',
      module: 'menu',
      languageCode: merchant.preferred_language || 'en',
    });

    return productPromotion;
  } catch (error) {
    logger.error('Error applying dynamic pricing', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for ordering new menu items.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackMenuGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'new_menu_item_ordered',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_menu_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'menu:pointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'menu_points_awarded',
      messageKey: 'menu.menu_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'menu',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking menu gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  createMenu,
  updateMenu,
  applyDynamicPricing,
  trackMenuGamification,
};