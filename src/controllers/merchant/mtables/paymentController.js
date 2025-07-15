'use strict';

const { processPayment, manageSplitPayments, issueRefund } = require('@services/merchant/mtables/paymentService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const walletService = require('@services/common/walletService');
const pointService = require('@services/common/pointService');
const mTablesConstants = require('@constants/mTablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const processPaymentController = catchAsync(async (req, res) => {
  const { bookingId, amount, walletId, paymentMethodId } = req.body;
  const { staffId, ipAddress } = req;
  const payment = await processPayment(bookingId, amount, walletId, { staffId, paymentMethodId });

  await walletService.processTransaction(
    {
      walletId,
      type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
      amount: -amount,
      currency: payment.currency,
      paymentMethodId,
    },
    { transaction: null }
  );

  await notificationService.sendNotification({
    userId: req.user.id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
    messageKey: 'payment.completed',
    messageParams: { orderId: payment.in_dining_order_id, amount },
    role: 'customer',
    module: 'mtables',
    orderId: payment.in_dining_order_id,
  });

  await notificationService.sendNotification({
    userId: payment.merchant_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    messageKey: 'payment.received',
    messageParams: { orderId: payment.in_dining_order_id, amount },
    role: 'merchant',
    module: 'mtables',
    orderId: payment.in_dining_order_id,
  });

  await socketService.emit(null, 'payment:completed', {
    userId: req.user.id,
    role: 'customer',
    orderId: payment.in_dining_order_id,
    paymentId: payment.id,
  });

  await auditService.logAction({
    userId: staffId || req.user.id,
    role: staffId ? 'merchant' : 'customer',
    action: mTablesConstants.AUDIT_TYPES.PAYMENT_PROCESSED,
    details: { orderId: payment.in_dining_order_id, paymentId: payment.id, amount },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: req.user.id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.PAYMENT_COMPLETED.action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'payment.completed', { orderId: payment.in_dining_order_id, amount }),
    data: payment,
  });
});

const manageSplitPaymentsController = catchAsync(async (req, res) => {
  const { bookingId, payments } = req.body;
  const { staffId, ipAddress } = req;
  const result = await manageSplitPayments(bookingId, payments, { staffId });

  for (const payment of payments) {
    const customer = await Customer.findByPk(payment.customerId);
    await walletService.processTransaction(
      {
        walletId: payment.walletId,
        type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
        amount: -payment.amount,
        currency: result.order.currency,
        paymentMethodId: payment.paymentMethodId,
      },
      { transaction: null }
    );

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
      messageKey: 'payment.completed',
      messageParams: { orderId: result.order.id, amount: payment.amount },
      role: 'customer',
      module: 'mtables',
      orderId: result.order.id,
    });

    await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: gamificationConstants.CUSTOMER_ACTIONS.SPLIT_PAYMENT.action,
      languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    });
  }

  await notificationService.sendNotification({
    userId: result.order.branch.merchant.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    messageKey: 'payment.received',
    messageParams: { orderId: result.order.id, totalAmount: result.order.total_amount },
    role: 'merchant',
    module: 'mtables',
    orderId: result.order.id,
  });

  await socketService.emit(null, 'payment:completed', {
    userId: result.order.customer_id,
    role: 'customer',
    orderId: result.order.id,
    paymentIds: result.payments.map(p => p.id),
  });

  await auditService.logAction({
    userId: staffId || result.order.branch.merchant.user_id,
    role: 'merchant',
    action: mTablesConstants.AUDIT_TYPES.SPLIT_PAYMENT_PROCESSED,
    details: { orderId: result.order.id, paymentIds: result.payments.map(p => p.id) },
    ipAddress: ipAddress || 'unknown',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'payment.completed', { orderId: result.order.id, amount: result.order.total_amount }),
    data: result,
  });
});

const issueRefundController = catchAsync(async (req, res) => {
  const { bookingId, walletId, amount } = req.body;
  const { staffId, ipAddress } = req;
  const refund = await issueRefund(bookingId, walletId, { amount, staffId });

  await walletService.processTransaction(
    {
      walletId,
      type: paymentConstants.FINANCIAL_SETTINGS.REFUND_TRANSACTION_TYPE,
      amount,
      currency: refund.currency,
    },
    { transaction: null }
  );

  await notificationService.sendNotification({
    userId: req.user.id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.REFUND_ISSUED,
    messageKey: 'payment.refunded',
    messageParams: { orderId: refund.in_dining_order_id, amount },
    role: 'customer',
    module: 'mtables',
    orderId: refund.in_dining_order_id,
  });

  await notificationService.sendNotification({
    userId: refund.merchant_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.REFUND_PROCESSED,
    messageKey: 'payment.refunded_processed',
    messageParams: { orderId: refund.in_dining_order_id, amount },
    role: 'merchant',
    module: 'mtables',
    orderId: refund.in_dining_order_id,
  });

  await socketService.emit(null, 'payment:refunded', {
    userId: req.user.id,
    role: 'customer',
    orderId: refund.in_dining_order_id,
    refundId: refund.id,
  });

  await auditService.logAction({
    userId: staffId || refund.merchant_id,
    role: 'merchant',
    action: mTablesConstants.AUDIT_TYPES.REFUND_ISSUED,
    details: { orderId: refund.in_dining_order_id, refundId: refund.id, amount },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: req.user.id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.PAYMENT_REFUNDED.action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'payment.refunded', { orderId: refund.in_dining_order_id, amount }),
    data: refund,
  });
});

module.exports = { processPaymentController, manageSplitPaymentsController, issueRefundController };