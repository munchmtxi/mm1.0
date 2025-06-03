'use strict';

const { sequelize } = require('@models');
const promotionService = require('@services/customer/munch/promotionService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const redeemPromotion = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { promotionId, orderId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { promotionId, discountAmount, status, wallet, redemptionId, currency } = await promotionService.redeemPromotion(customerId, promotionId, orderId, transaction);
    if (discountAmount > 0 && wallet) {
      await walletService.processTransaction({
        walletId: wallet.id,
        type: 'deduction',
        amount: discountAmount,
        currency: 'usd',
        description: `Promotion redemption: ${promotionId}`,
      }, transaction);
    }
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'promotion_redeemed').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
      messageKey: 'promotion.redeemed',
      messageParams: { promotionId },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'promotion:redeemed', {
      promotionId,
      discountAmount,
      redemptionId,
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'REDEEM_PROMOTION',
      userId: customerId,
      role: 'customer',
      details: `Redeemed promotion_id: ${promotionId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Promotion redeemed', { customerId, promotionId, discountAmount });
    res.status(200).json({
      status: 'success',
      data: { promotionId, discountAmount, status, redemptionId }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const getAvailablePromotions = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const transaction = await sequelize.transaction();
  try {
    const promotions = await promotionService.getAvailablePromotions(customerId, transaction);
    await auditService.logAction({
      action: 'VIEW_PROMOTIONS',
      userId: customerId,
      role: 'customer',
      details: `Retrieved available promotions for customer_id: ${customerId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Available promotions retrieved', { customerId, promotionCount: promotions.promotions.length });
    res.status(200).json({ status: 'success', data: promotions });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { redeemPromotion, getAvailablePromotions };