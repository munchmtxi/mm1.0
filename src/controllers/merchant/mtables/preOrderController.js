'use strict';

const { createPreOrder, manageGroupPayments, provideFeedback } = require('@services/merchant/mtables/preOrderService');
const { Customer, InDiningOrder, MerchantBranch, Merchant, Staff, Wallet } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const mTablesConstants = require('@constants/common/mTablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const customerConstants = require('@constants/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const createPreOrderController = catchAsync(async (req, res) => {
  const { bookingId, customerId, branchId, items, staffId } = req.body;
  const { ipAddress } = req;
  const order = await createPreOrder({ bookingId, customerId, branchId, items, staffId, ipAddress });

  const customer = await Customer.findByPk(customerId);
  const branch = await MerchantBranch.findByPk(branchId, { include: [{ model: Merchant, as: 'merchant' }] });

  await notificationService.sendNotification({
    userId: customer.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
    messageKey: 'pre_order.created',
    messageParams: { orderId: order.id, totalAmount: order.total_amount },
    role: 'customer',
    module: 'mtables',
    orderId: order.id,
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PRE_ORDER_RECEIVED,
    messageKey: 'pre_order.received',
    messageParams: { orderId: order.id, orderNumber: order.order_number },
    role: 'merchant',
    module: 'mtables',
    orderId: order.id,
  });

  await socketService.emit(null, 'pre_order:created', {
    userId: customer.user_id,
    role: 'customer',
    orderId: order.id,
    branchId,
  });

  await auditService.logAction({
    userId: customer.user_id,
    role: 'customer',
    action: mTablesConstants.AUDIT_TYPES.PRE_ORDER_CREATED,
    details: { orderId: order.id, totalAmount: order.total_amount, branchId },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: customer.user_id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'pre_order_placed').action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'pre_order.created', { orderId: order.id, totalAmount: order.total_amount }),
    data: order,
  });
});

const manageGroupPaymentsController = catchAsync(async (req, res) => {
  const { orderId, customerIds, paymentSplits, staffId } = req.body;
  const { ipAddress } = req;
  const result = await manageGroupPayments({ orderId, customerIds, paymentSplits, staffId, ipAddress });

  for (const split of paymentSplits) {
    const customer = await Customer.findByPk(split.customerId);
    const wallet = await Wallet.findOne({ where: { user_id: customer.user_id } });

    await walletService.processTransaction({
      walletId: wallet.id,
      type: paymentConstants.FINANCIAL_SETTINGS.PAYMENT_TRANSACTION_TYPE,
      amount: -split.amount,
      currency: result.order.currency,
      paymentMethodId: split.paymentMethodId,
    });

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_COMPLETED,
      messageKey: 'payment.completed',
      messageParams: { orderId, amount: split.amount },
      role: 'customer',
      module: 'mtables',
      orderId,
    });

    await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'split_payment').action,
      languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    });
  }

  const order = await InDiningOrder.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] });
  await notificationService.sendNotification({
    userId: order.branch.merchant.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    messageKey: 'payment.received',
    messageParams: { orderId, totalAmount: order.total_amount },
    role: 'merchant',
    module: 'mtables',
    orderId,
  });

  await socketService.emit(null, 'payment:completed', {
    userId: order.customer_id,
    role: 'customer',
    orderId,
    branchId: order.branch_id,
  });

  await auditService.logAction({
    userId: staffId ? (await Staff.findByPk(staffId)).user_id : order.branch.merchant.user_id,
    role: 'merchant',
    action: mTablesConstants.AUDIT_TYPES.GROUP_PAYMENT,
    details: { orderId, customerIds },
    ipAddress: ipAddress || 'unknown',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'payment.completed', { orderId, amount: order.total_amount }),
    data: result,
  });
});

const provideFeedbackController = catchAsync(async (req, res) => {
  const { orderId, merchantId, staffId, comment, substitutions } = req.body;
  const { ipAddress } = req;
  const feedback = await provideFeedback({ orderId, merchantId, staffId, comment, substitutions, ipAddress });

  const order = await InDiningOrder.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch' }] });
  const customer = await Customer.findByPk(order.customer_id);

  await notificationService.sendNotification({
    userId: customer.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.FEEDBACK_SUBMITTED,
    messageKey: 'feedback.submitted',
    messageParams: { orderId, rating: feedback.rating },
    role: 'customer',
    module: 'mtables',
    feedbackId: feedback.id,
  });

  await socketService.emit(null, 'feedback:submitted', {
    userId: customer.user_id,
    role: 'customer',
    feedbackId: feedback.id,
    orderId,
  });

  await auditService.logAction({
    userId: (await Staff.findByPk(staffId)).user_id,
    role: 'merchant',
    action: mTablesConstants.AUDIT_TYPES.FEEDBACK_SUBMITTED,
    details: { orderId, feedbackId: feedback.id, substitutions },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: customer.user_id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'feedback_submitted').action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'feedback.submitted', { orderId, rating: feedback.rating }),
    data: feedback,
  });
});

module.exports = { createPreOrderController, manageGroupPaymentsController, provideFeedbackController };