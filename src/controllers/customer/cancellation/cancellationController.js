'use strict';

/**
 * Controller for customer cancellation and refund.
 */
const { sequelize } = require('@models');
const cancellationService = require('@services/customer/cancellationService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const mtablesConstants = require('@constants/mtablesConstants');
const munchConstants = require('@constants/munchConstants');
const rideConstants = require('@constants/rideConstants');
const mparkConstants = require('@constants/mparkConstants');
const paymentConstants = require('@constants/paymentConstants');

/**
 * Processes cancellation request.
 */
const processCancellation = catchAsync(async (req, res, next) => {
  const { serviceId, serviceType, reason } = req.body;
  const userId = req.user.id;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Processing cancellation request', { serviceId, serviceType, userId });

  const transaction = await sequelize.transaction();
  try {
    const { serviceType: resolvedServiceType, reference, user } = await cancellationService.processCancellation({
      serviceId,
      serviceType,
      reason,
      userId,
      transaction,
    });

    const messageKey = `cancellation.${resolvedServiceType}_cancelled`;
    const message = formatMessage({
      role: 'customer',
      module: 'notifications',
      languageCode: user.preferred_language,
      messageKey,
      params: { reference, reason },
    });

    await notificationService.sendNotification({
      userId,
      type: 'CANCELLATION',
      message,
      priority: 'HIGH',
      languageCode: user.preferred_language,
      bookingId: resolvedServiceType === 'mtables' ? serviceId : null,
      orderId: resolvedServiceType === 'munch' ? serviceId : null,
      inDiningOrderId: resolvedServiceType === 'in_dining' ? serviceId : null,
      parkingBookingId: resolvedServiceType === 'mpark' ? serviceId : null,
    }, transaction);

    await auditService.logAction({
      userId,
      role: 'customer',
      action: 'CANCELLATION',
      details: { serviceType: resolvedServiceType, serviceId, reason },
      ipAddress,
    }, transaction);

    await socketService.emit(io, `cancellation:${resolvedServiceType}:${serviceId}`, {
      userId,
      role: 'customer',
      status: 'cancelled',
      reason,
      auditAction: 'CANCELLATION_EVENT',
    });

    // Award gamification points
    const gamificationActions = {
      mtables: mtablesConstants.GAMIFICATION_ACTIONS,
      munch: munchConstants.GAMIFICATION_ACTIONS,
      mtxi: rideConstants.GAMIFICATION_ACTIONS,
      in_dining: mtablesConstants.GAMIFICATION_ACTIONS,
      mpark: mparkConstants.GAMIFICATION_ACTIONS,
    }[resolvedServiceType];
    let gamificationError = null;
    const action = gamificationActions?.CANCELLATION;
    if (action) {
      try {
        await pointService.awardPoints({
          userId,
          action: action.action,
          points: action.points,
          metadata: { io, role: 'customer', serviceType: resolvedServiceType, serviceId },
        });
      } catch (error) {
        gamificationError = error;
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      data: { serviceType: resolvedServiceType, reference, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Cancellation failed', { error: error.message, serviceId, userId });
    return next(new AppError(error.message, 400, customerConstants.ERROR_CODES.find(code => code === 'CANCELLATION_FAILED')));
  }
});

/**
 * Processes refund request.
 */
const issueRefund = catchAsync(async (req, res, next) => {
  const { serviceId, walletId, serviceType } = req.body;
  const userId = req.user.id;
  const ipAddress = req.ip;

  logger.info('Processing refund request', { serviceId, walletId, serviceType, userId });

  const transaction = await sequelize.transaction();
  try {
    const { payment, serviceType: resolvedServiceType, adjustedAmount, wallet } = await cancellationService.issueRefund({
      serviceId,
      serviceType,
      walletId,
      userId,
      transaction,
    });

    await walletService.processTransaction({
      walletId,
      amount: adjustedAmount,
      type: paymentConstants.TRANSACTION_TYPES.REFUNDED,
      currency: payment.currency,
      description: `Refund for ${resolvedServiceType} service ${serviceId}`,
    }, transaction);

    await payment.update({ status: paymentConstants.PAYMENT_STATUSES.REFUNDED }, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'notifications',
      languageCode: 'en',
      messageKey: 'cancellation.refunded',
      params: { amount: adjustedAmount, currency: payment.currency, serviceType: resolvedServiceType },
    });

    await notificationService.sendNotification({
      userId,
      type: 'cancellation_refunded',
      message,
      priority: 'HIGH',
      languageCode: 'en',
    }, transaction);

    await auditService.logAction({
      userId,
      role: 'customer',
      action: 'refund_processed',
      details: { serviceId, serviceType: resolvedServiceType, amount: adjustedAmount, currency: payment.currency },
      ipAddress,
    }, transaction);

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      data: { refundId: payment.id, amount: adjustedAmount, currency: payment.currency },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Refund failed', { error: error.message, serviceId, userId });
    return next(new AppError(error.message, 400, customerConstants.ERROR_CODES.find(code => code === 'REFUND_FAILED')));
  }
});

module.exports = {
  processCancellation,
  issueRefund,
};