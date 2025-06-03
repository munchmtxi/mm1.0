'use strict';

/**
 * promotionService.js
 * Manages promotions, loyalty programs, point redemptions, and gamification for Munch merchant service.
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
const { ProductPromotion, PromotionRule, PromotionRedemption, PromotionMenuItem, Customer, Order, MenuInventory, MerchantBranch, Notification, AuditLog, GamificationPoints } = require('@models');

/**
 * Designs discounts or referral promotions.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} details - Promotion details (name, type, value, menuItems, rules).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created promotion.
 */
async function createPromotion(restaurantId, details, io) {
  try {
    if (!restaurantId || !details?.name || !details?.type) throw new Error('Restaurant ID, name, and type required');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'];
    if (!validTypes.includes(details.type)) throw new Error('Invalid promotion type');

    const promotion = await ProductPromotion.create({
      merchant_id: branch.merchant_id,
      name: details.name,
      description: details.description,
      type: details.type,
      value: details.value,
      code: details.code,
      start_date: details.start_date,
      end_date: details.end_date,
      min_purchase_amount: details.min_purchase_amount || 0,
      usage_limit: details.usage_limit,
      customer_eligibility: details.customer_eligibility || 'all',
      created_by: 'system',
    });

    if (details.menuItems?.length) {
      const menuItems = await MenuInventory.findAll({
        where: { id: details.menuItems, merchant_id: branch.merchant_id },
      });
      if (menuItems.length !== details.menuItems.length) throw new Error('Invalid menu items');

      await PromotionMenuItem.bulkCreate(
        details.menuItems.map(itemId => ({ promotion_id: promotion.id, menu_item_id: itemId }))
      );
    }

    if (details.rules?.length) {
      await PromotionRule.bulkCreate(
        details.rules.map(rule => ({
          promotion_id: promotion.id,
          rule_type: rule.rule_type,
          conditions: rule.conditions,
          priority: rule.priority || 1,
        }))
      );
    }

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'create_promotion',
      details: { restaurantId, promotionId: promotion.id, name: promotion.name },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'promotion:created', { promotionId: promotion.id, name: promotion.name }, `merchant:${restaurantId}`);

    return promotion;
  } catch (error) {
    logger.error('Error creating promotion', { error: error.message });
    throw error;
  }
}

/**
 * Administers loyalty program tiers.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Array} tiers - Loyalty tiers (name, pointsRequired, rewards).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Loyalty program details.
 */
async function manageLoyaltyProgram(restaurantId, tiers, io) {
  try {
    if (!restaurantId || !tiers?.length) throw new Error('Restaurant ID and tiers required');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const existingLoyalty = await ProductPromotion.findOne({
      where: { merchant_id: branch.merchant_id, type: 'loyalty' },
    });

    let loyaltyProgram;
    if (existingLoyalty) {
      await existingLoyalty.update({ description: JSON.stringify(tiers) });
      loyaltyProgram = existingLoyalty;
    } else {
      loyaltyProgram = await ProductPromotion.create({
        merchant_id: branch.merchant_id,
        name: `Loyalty Program for ${branch.name}`,
        type: 'loyalty',
        description: JSON.stringify(tiers),
        customer_eligibility: 'loyalty',
        is_active: true,
        created_by: 'system',
      });
    }

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'manage_loyalty_program',
      details: { restaurantId, tiers: tiers.map(t => t.name) },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'promotion:loyaltyUpdated', { restaurantId, tiers }, `merchant:${restaurantId}`);

    return loyaltyProgram;
  } catch (error) {
    logger.error('Error managing loyalty program', { error: error.message });
    throw error;
  }
}

/**
 * Processes point redemptions for rewards.
 * @param {number} customerId - Customer ID.
 * @param {number} rewardId - Promotion ID for reward.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Redemption result.
 */
async function redeemPoints(customerId, rewardId, io) {
  try {
    if (!customerId || !rewardId) throw new Error('Customer ID and reward ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const promotion = await ProductPromotion.findByPk(rewardId);
    if (!promotion || promotion.type !== 'loyalty' || !promotion.is_active) throw new Error('Invalid or inactive reward');

    const tiers = JSON.parse(promotion.description || '[]');
    const rewardTier = tiers.find(t => t.rewardId === rewardId);
    if (!rewardTier) throw new Error('Reward not found in loyalty program');

    const pointsBalance = await GamificationPoints.sum('points', {
      where: { user_id: customerId, role: 'customer', expiry_date: { [Op.gt]: new Date() } },
    });
    if (pointsBalance < rewardTier.pointsRequired) throw new Error('Insufficient points');

    const redemption = await PromotionRedemption.create({
      promotion_id: promotion.id,
      customer_id: customerId,
      order_id: null,
      discount_amount: rewardTier.discount_amount || 0,
      promotion_code: promotion.code,
    });

    await pointService.deductPoints({
      userId: customerId,
      role: 'customer',
      points: rewardTier.pointsRequired,
      action: 'reward_redemption',
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'redeem_points',
      details: { customerId, rewardId, discount_amount: redemption.discount_amount },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'promotion:pointsRedeemed', {
      customerId,
      rewardId,
      discount_amount: redemption.discount_amount,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'reward_redemption',
      messageKey: 'promotion.reward_redeemed',
      messageParams: { reward: promotion.name, amount: redemption.discount_amount },
      role: 'customer',
      module: 'promotion',
      languageCode: customer.preferred_language || 'en',
    });

    return redemption;
  } catch (error) {
    logger.error('Error redeeming points', { error: error.message });
    throw error;
  }
}

/**
 * Awards loyalty or referral points to customers.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points record.
 */
async function trackPromotionGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const pointsRecord = await pointService.awardPoints({
      userId: customerId,
      role: 'customer',
      action: 'promotion_participation',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'track_promotion_gamification',
      details: { customerId, points: pointsRecord.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'gamification:pointsAwarded', {
      customerId,
      points: pointsRecord.points,
      action: 'promotion_participation',
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'points_earned',
      messageKey: 'promotion.points_earned',
      messageParams: { points: pointsRecord.points },
      role: 'customer',
      module: 'promotion',
      languageCode: customer.preferred_language || 'en',
    });

    return pointsRecord;
  } catch (error) {
    logger.error('Error tracking promotion gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  createPromotion,
  manageLoyaltyProgram,
  redeemPoints,
  trackPromotionGamification,
};