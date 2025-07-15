'use strict';

const { createPromotion, manageLoyaltyProgram, redeemPoints } = require('@services/merchant/munch/promotionService');
const { ProductPromotion, Customer, GamificationPoints } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

const createPromotionController = catchAsync(async (req, res) => {
  const { restaurantId, details } = req.body;
  const { promotionId, name, type } = await createPromotion(restaurantId, details);

  await socketService.emit(null, 'promotion:created', { promotionId, name }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.CREATE_PROMOTION,
    details: { restaurantId, promotionId, name },
    ipAddress: req.ip || '0.0.0.0',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'promotion.created', { name, restaurantId }),
    data: { promotionId, name, type },
  });
});

const manageLoyaltyProgramController = catchAsync(async (req, res) => {
  const { restaurantId, tiers } = req.body;
  const { promotionId, name, tiers: updatedTiers } = await manageLoyaltyProgram(restaurantId, tiers);

  await socketService.emit(null, 'promotion:loyalty_updated', { restaurantId, tiers: updatedTiers }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.MANAGE_LOYALTY_PROGRAM,
    details: { restaurantId, tiers: updatedTiers.map(t => t.name) },
    ipAddress: req.ip || '0.0.0.0',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'promotion.loyaltyUpdated', { restaurantId }),
    data: { promotionId, name, tiers: updatedTiers },
  });
});

const redeemPointsController = catchAsync(async (req, res) => {
  const { customerId, rewardId } = req.body;
  const { redemptionId, discountAmount, rewardId: redeemedRewardId } = await redeemPoints(customerId, rewardId);

  const customer = await Customer.findByPk(customerId);
  const promotion = await ProductPromotion.findByPk(rewardId);
  const tiers = JSON.parse(promotion.description || '[]');
  const rewardTier = tiers.find(t => t.rewardId === rewardId);

  const pointsBalance = await GamificationPoints.sum('points', {
    where: { user_id: customerId, role: 'customer', expiry_date: { [Op.gt]: new Date() } },
  });
  if (pointsBalance < rewardTier.pointsRequired) {
    throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.insufficientPoints'), 400, munchConstants.ERROR_CODES[0]);
  }

  await pointService.deductPoints({
    userId: customerId,
    role: 'customer',
    points: rewardTier.pointsRequired,
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'reward_redemption').action,
  });

  await socketService.emit(null, 'promotion:points_redeemed', { customerId, rewardId, discountAmount }, `customer:${customerId}`);

  await auditService.logAction({
    userId: customerId,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.REDEEM_POINTS,
    details: { customerId, rewardId, discountAmount },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: customerId,
    notificationType: munchConstants.NOTIFICATION_TYPES.REWARD_REDEMPTION,
    messageKey: 'promotion.rewardRedeemed',
    messageParams: { reward: promotion.name, amount: discountAmount },
    role: 'customer',
    module: 'promotion',
    languageCode: customer.preferred_language || 'en',
  });

  // Award points for promotion participation
  await pointService.awardPoints({
    userId: customerId,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'promotion_participation').action,
    languageCode: customer.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'promotion.rewardRedeemed', { reward: promotion.name, amount: discountAmount, customerId }),
    data: { redemptionId, discountAmount, rewardId: redeemedRewardId },
  });
});

module.exports = {
  createPromotionController,
  manageLoyaltyProgramController,
  redeemPointsController,
};