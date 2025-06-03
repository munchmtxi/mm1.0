'use strict';

const { sequelize, Op } = require('@models');
const {
  redeemPromotion,
  getAvailablePromotions,
  analyzePromotionEngagement,
} = require('@services/customer/mtables/promotionService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Customer, MerchantPerformanceMetrics } = require('@models');

const redeemPromotion = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { promotionId, orderId, couponCode } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Redeeming promotion', { customerId, promotionId });

  const transaction = await sequelize.transaction();
  try {
    const redemption = await redeemPromotion({
      customerId,
      promotionId,
      orderId,
      couponCode,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });
    const order = await sequelize.models.InDiningOrder.findByPk(orderId, { transaction });

    await MerchantPerformanceMetrics.update(
      {
        total_revenue: sequelize.literal(`total_revenue - ${redemption.discount_amount}`),
        net_revenue: sequelize.literal(`net_revenue - ${redemption.discount_amount}`),
        updated_at: new Date(),
      },
      {
        where: {
          merchant_id: order.branch.merchant_id,
          period_type: 'daily',
          period_start: { [Op.lte]: new Date() },
          period_end: { [Op.gte]: new Date() },
        },
        transaction,
      }
    );

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'promotion.redeemed',
      params: { promotionId, discountAmount: redemption.discount_amount },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.promotion,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PROMOTION_REDEEMED || 'promotion:redeemed',
        details: { promotionId, orderId, discountAmount: redemption.discount_amount },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'promotion:redeemed', {
      userId: customer.user_id,
      role: 'customer',
      promotionId,
      discountAmount: redemption.discount_amount,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(
        a => a.action === 'promotion_redeemed'
      ) || { action: 'promotion_redeemed', points: 10 };
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points || 10,
          metadata: { io, role: 'customer', promotionId },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Promotion redeemed') || 'Promotion redeemed',
      data: { redemptionId: redemption.id, discountAmount: redemption.discount_amount, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Promotion redemption failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PROMOTION_REDEMPTION_FAILED') || 'PROMOTION_REDEMPTION_FAILED'));
  }
});

const getAvailablePromotions = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;

  logger.info('Fetching available promotions', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const promotions = await getAvailablePromotions({ customerId, transaction });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Promotions retrieved') || 'Promotions retrieved',
      data: promotions,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to fetch promotions', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PROMOTIONS_RETRIEVAL_FAILED') || 'PROMOTIONS_RETRIEVAL_FAILED'));
  }
});

const analyzePromotionEngagement = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;

  logger.info('Analyzing promotion engagement', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const metrics = await analyzePromotionEngagement({ customerId, transaction });

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PROMOTION_ENGAGEMENT_ANALYZED || 'promotion:engagement_analyzed',
        details: { totalRedemptions: metrics.totalRedemptions, totalDiscountAmount: metrics.totalDiscountAmount },
        ipAddress: req.ip,
      },
      transaction
    );

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Promotion engagement analyzed') || 'Promotion engagement analyzed',
      data: metrics,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Promotion engagement analysis failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PROMOTION_ENGAGEMENT_ANALYSIS_FAILED') || 'PROMOTION_ENGAGEMENT_ANALYSIS_FAILED'));
  }
});

module.exports = {
  redeemPromotion,
  getAvailablePromotions,
  analyzePromotionEngagement,
};