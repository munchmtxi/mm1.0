'use strict';

const { sequelize } = require('@models');
const { processPayment, issueRefund, sendPaymentRequest: sendPaymentRequestService } = require('@services/customer/mtables/paymentService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/paymentConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Customer } = require('@models');

const processPayment = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { id, amount, walletId, paymentMethodId, splitPayments, type } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Processing payment', { customerId, type, id });

  const transaction = await sequelize.transaction();
  try {
    const { payment, transactions } = await processPayment({
      id,
      amount,
      walletId,
      paymentMethodId,
      splitPayments,
      type,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'payment.confirmed',
      params: { amount: payment.amount, currency: payment.currency },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.payment_confirmation,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_PROCESSED || 'payment:processed',
        details: { paymentId: payment.id, amount: payment.amount, type },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'payment:processed', {
      userId: customer.user_id,
      role: 'customer',
      paymentId: payment.id,
      amount: payment.amount,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(
        a => a.action === 'payment'
      ) || { action: 'payment', points: 15, walletCredit: 0.40 };
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points || 15,
          metadata: { io, role: 'customer', paymentId: payment.id },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Payment processed') || 'Payment processed',
      data: { paymentId: payment.id, amount: payment.amount, transactions, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Payment processing failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PAYMENT_PROCESSING_FAILED') || 'PAYMENT_PROCESSING_FAILED'));
  }
});

const issueRefund = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { id, walletId, transactionId, type } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Issuing refund', { customerId, type, id });

  const transaction = await sequelize.transaction();
  try {
    const refundTransaction = await issueRefund({
      id,
      walletId,
      transactionId,
      type,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'payment.refunded',
      params: { amount: refundTransaction.amount, currency: refundTransaction.currency },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.payment_confirmation,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REFUND_PROCESSED || 'payment:refunded',
        details: { transactionId: refundTransaction.id, amount: refundTransaction.amount, type },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'payment:refunded', {
      userId: customer.user_id,
      role: 'customer',
      transactionId: refundTransaction.id,
      amount: refundTransaction.amount,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Refund processed') || 'Refund processed',
      data: { transactionId: refundTransaction.id, amount: refundTransaction.amount },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Refund processing failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'REFUND_PROCESSING_FAILED') || 'REFUND_PROCESSING_FAILED'));
  }
});

const sendPaymentRequest = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId } = req.params;
  const { amount, billSplitType } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Sending payment request', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const paymentRequests = await sendPaymentRequestService({
      bookingId,
      amount,
      billSplitType,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.PAYMENT_REQUEST_SENT,
        details: { bookingId, amount, billSplitType },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'payment_request:sent', {
      userId: customer.user_id,
      role: 'customer',
      bookingId,
      amount,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(msg => msg === 'Bill split processed') || 'Bill split processed',
      data: { bookingId, paymentRequests },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Payment request failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.INVALID_BILL_SPLIT));
  }
});

module.exports = {
  processPayment,
  issueRefund,
  sendPaymentRequest,
};