'use strict';

const promotionService = require('@services/customer/mtxi/promotionService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { sequelize } = require('sequelize');

async function redeemPromotion(req, res) {
  const { promotionId, serviceType, groupCustomerIds } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const promotion = await promotionService.redeemPromotion(customerId, promotionId, { serviceType, groupCustomerIds }, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PROMOTION_REDEEMED.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PROMOTION_REDEEMED,
      details: { promotionId, serviceType, groupCustomerIds },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      message: formatMessage('promotion.redeemed', { promotionId, service: serviceType }),
    });

    await socketService.emit('promotion:redeemed', { userId: customerId, role: 'customer', promotionId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Promotion redeemed',
      data: { promotionId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 500, error.code || customerConstants.ERROR_CODES[10]);
  }
}

async function getAvailablePromotions(req, res) {
  const { serviceType } = req.query;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    const promotions = await promotionService.getAvailablePromotions(customerId, serviceType, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Available promotions retrieved',
      data: promotions,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[6]);
  }
}

async function cancelPromotionRedemption(req, res) {
  const { promotionId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const promotion = await promotionService.cancelPromotionRedemption(customerId, promotionId, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PROMOTION_CANCELLATION.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PROMOTION_CANCELLED,
      details: { promotionId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      message: formatMessage('promotion.cancelled', { promotionId }),
    });

    await socketService.emit('promotion:cancelled', { userId: customerId, role: 'customer', promotionId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Promotion redemption cancelled',
      data: { promotionId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[10]);
  }
}

module.exports = {
  redeemPromotion,
  getAvailablePromotions,
  cancelPromotionRedemption,
};