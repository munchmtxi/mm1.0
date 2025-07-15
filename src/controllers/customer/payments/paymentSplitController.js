'use strict';

const { sequelize } = require('@models');
const splitPaymentService = require('@services/customer/splitPayment');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const paymentConstants = require('@constants/common/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');
const munchConstants = require('@constants/customer/munch/munchConstants');
const mtablesConstants = require('@constants/customer/mtables/mtablesConstants');
const mtxiConstants = require('@constants/customer/mtxi/mtxiConstants');
const meventsConstants = require('@constants/customer/mevents/meventsConstants');
const mparkConstants = require('@constants/customer/mpark/mparkConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const socketConstants = require('@constants/common/socketConstants');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Initiates a split payment for a service.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 */
exports.initiateSplitPayment = async (req, res, next) => {
  const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE, sessionToken } = req.user;
  const { serviceId, serviceType, payments, billSplitType, location } = req.body;
  const io = req.app.get('io');

  try {
    // Validate inputs
    if (!userId || role !== 'customer') {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.unauthorized'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }
    if (!serviceId || !['order', 'in_dining_order', 'booking', 'ride', 'event'].includes(serviceType)) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_service'),
        400,
        paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
      );
    }
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_payments'),
        400,
        paymentConstants.ERROR_CODES.INVALID_AMOUNT
      );
    }
    if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType.toUpperCase())) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_bill_split_type'),
        400,
        socialConstants.ERROR_CODES.INVALID_BILL_SPLIT
      );
    }
    if (payments.length > socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.max_split_participants_exceeded', {
          max: socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS,
        }),
        400,
        socialConstants.ERROR_CODES.MAX_SPLIT_PARTICIPANTS_EXCEEDED
      );
    }
    for (const payment of payments) {
      if (!payment.customerId || !payment.amount || !paymentConstants.PAYMENT_METHODS.includes(payment.paymentMethod?.toUpperCase())) {
        throw new AppError(
          formatMessage('customer', 'payments', languageCode, 'error.invalid_payment_details'),
          400,
          paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
        );
      }
      const financialLimit = paymentConstants.FINANCIAL_LIMITS.find(
        limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT
      );
      if (payment.amount < financialLimit.min || payment.amount > financialLimit.max) {
        throw new AppError(
          formatMessage('customer', 'payments', languageCode, 'error.invalid_amount_range', {
            min: financialLimit.min,
            max: financialLimit.max,
          }),
          400,
          paymentConstants.ERROR_CODES.INVALID_AMOUNT
        );
      }
    }

    // Location validation for rides and in-dining orders
    if (['ride', 'in_dining_order'].includes(serviceType) && location) {
      await locationService.resolveLocation(location, userId, sessionToken, 'customer', languageCode);
    }

    // Process split payment in a transaction
    const result = await sequelize.transaction(async (transaction) => {
      const paymentResult = await splitPaymentService.splitPayment(
        serviceId,
        serviceType,
        payments,
        billSplitType.toUpperCase(),
        transaction
      );

      // Log audit action
      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_INITIATED,
        details: { serviceId, serviceType, billSplitType, splitCount: payments.length },
        ipAddress: req.ip,
        metadata: { sessionToken },
      }, transaction);

      return paymentResult;
    });

    // Send notifications to participants
    for (const payment of result.splitPayments) {
      await notificationService.sendNotification({
        userId: payment.customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], // payment_confirmation
        messageKey: 'payments.payment_confirmation',
        messageParams: { amount: payment.amount, serviceType, serviceId },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        role: 'customer',
        module: 'payments',
        orderId: serviceType === 'order' ? serviceId : null,
        bookingId: serviceType === 'booking' ? serviceId : null,
      });
    }

    // Emit socket event
    await socketService.emit(
      io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_PAYMENT_CONFIRMED,
      {
        userId,
        role: 'customer',
        serviceId,
        serviceType,
        billSplitType,
        splitPayments: result.splitPayments,
        auditAction: socketConstants.SOCKET_AUDIT_ACTIONS.PAYMENT_CONFIRMED,
        details: { serviceId, serviceType, splitCount: payments.length },
      },
      `customer:${userId}`,
      languageCode
    );

    // Format response
    const response = {
      success: true,
      message: formatMessage('customer', 'payments', languageCode, 'success.payment_initiated', {
        serviceId,
        serviceType,
      }),
      data: result,
    };

    logger.logApiEvent('Split payment initiated', { userId, serviceId, serviceType, splitCount: payments.length });
    res.status(200).json(response);
  } catch (error) {
    logger.logErrorEvent('Split payment failed', { userId, serviceId, serviceType, error: error.message });
    next(new AppError(
      formatMessage('customer', 'payments', languageCode, `error.${error.errorCode || 'generic'}`, {
        message: error.message,
      }),
      error.statusCode || 500,
      error.errorCode || paymentConstants.ERROR_CODES.TRANSACTION_FAILED,
      error.details,
      { serviceId, serviceType }
    ));
  }
};

/**
 * Processes refunds for a split payment.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 */
exports.processSplitPaymentRefund = async (req, res, next) => {
  const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE, sessionToken } = req.user;
  const { serviceId, serviceType, refunds } = req.body;
  const io = req.app.get('io');

  try {
    // Validate inputs
    if (!userId || role !== 'customer') {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.unauthorized'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }
    if (!serviceId || !['order', 'in_dining_order', 'booking', 'ride', 'event'].includes(serviceType)) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_service'),
        400,
        paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD
      );
    }
    if (!refunds || !Array.isArray(refunds) || refunds.length === 0) {
      throw new AppError(
        formatMessage('customer', 'payments', languageCode, 'error.invalid_refunds'),
        400,
        paymentConstants.ERROR_CODES.INVALID_AMOUNT
      );
    }
    for (const refund of refunds) {
      if (!refund.customerId || !refund.amount) {
        throw new AppError(
          formatMessage('customer', 'payments', languageCode, 'error.invalid_refund_details'),
          400,
          paymentConstants.ERROR_CODES.INVALID_AMOUNT
        );
      }
      const financialLimit = paymentConstants.FINANCIAL_LIMITS.find(
        limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND
      );
      if (refund.amount < financialLimit.min || refund.amount > financialLimit.max) {
        throw new AppError(
          formatMessage('customer', 'payments', languageCode, 'error.invalid_amount_range', {
            min: financialLimit.min,
            max: financialLimit.max,
          }),
          400,
          paymentConstants.ERROR_CODES.INVALID_AMOUNT
        );
      }
    }

    // Process refunds in a transaction
    const result = await sequelize.transaction(async (transaction) => {
      const refundResult = await splitPaymentService.manageSplitPaymentRefunds(
        serviceId,
        serviceType,
        refunds,
        transaction
      );

      // Log audit action
      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_REFUNDED,
        details: { serviceId, serviceType, refundCount: refunds.length },
        ipAddress: req.ip,
        metadata: { sessionToken },
      }, transaction);

      return refundResult;
    });

    // Send notifications to participants
    for (const refund of result.refunds) {
      await notificationService.sendNotification({
        userId: refund.customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[3], // payment_refunded
        messageKey: 'payments.refunded',
        messageParams: { amount: refund.amount, serviceType, serviceId },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        role: 'customer',
        module: 'payments',
        orderId: serviceType === 'order' ? serviceId : null,
        bookingId: serviceType === 'booking' ? serviceId : null,
      });
    }

    // Emit socket event
    await socketService.emit(
      io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_PAYMENT_REFUNDED,
      {
        userId,
        role: 'customer',
        serviceId,
        serviceType,
        refunds: result.refunds,
        auditAction: socketConstants.SOCKET_AUDIT_ACTIONS.PAYMENT_REFUNDED,
        details: { serviceId, serviceType, refundCount: refunds.length },
      },
      `customer:${userId}`,
      languageCode
    );

    // Format response
    const response = {
      success: true,
      message: formatMessage('customer', 'payments', languageCode, 'success.refunded', {
        serviceId,
        serviceType,
      }),
      data: result,
    };

    logger.logApiEvent('Split payment refund processed', { userId, serviceId, serviceType, refundCount: refunds.length });
    res.status(200).json(response);
  } catch (error) {
    logger.logErrorEvent('Split payment refund failed', { userId, serviceId, serviceType, error: error.message });
    next(new AppError(
      formatMessage('customer', 'payments', languageCode, `error.${error.errorCode || 'generic'}`, {
        message: error.message,
      }),
      error.statusCode || 500,
      error.errorCode || paymentConstants.ERROR_CODES.TRANSACTION_FAILED,
      error.details,
      { serviceId, serviceType }
    ));
  }
};

module.exports = {
  initiateSplitPayment,
  processSplitPaymentRefund,
};