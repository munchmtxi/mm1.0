'use strict';

const { processOrder, applyDietaryPreferences, updateOrderStatus, payOrderWithWallet } = require('@services/merchant/munch/orderService');
const { Order, Customer, MenuInventory, OrderItems, ProductAuditLog, ProductActivityLog } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const walletService = require('@services/common/walletService');
const munchConstants = require('@constants/common/munchConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const processOrderController = catchAsync(async (req, res) => {
  const { orderId, items } = req.body;
  const { orderId: processedOrderId, status, totalAmount } = await processOrder(orderId, items);

  const order = await Order.findByPk(processedOrderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });

  for (const item of items) {
    const menuItem = await MenuInventory.findByPk(item.menu_item_id);
    const quantity = item.quantity || 1;

    await ProductAuditLog.create({
      menu_item_id: item.menu_item_id,
      user_id: 'system',
      action: 'update',
      changes: { quantity: menuItem.quantity },
    });

    await ProductActivityLog.create({
      productId: item.menu_item_id,
      merchantBranchId: order.branch_id,
      actorId: 'system',
      actorType: 'system',
      actionType: 'stock_adjusted',
      previousState: { quantity: menuItem.quantity + quantity },
      newState: { quantity: menuItem.quantity },
    });
  }

  await auditService.logAction({
    userId: order.customer_id,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.PROCESS_ORDER,
    details: { orderId, totalAmount, items: items.map(i => i.menu_item_id) },
    ipAddress: req.ip || '0.0.0.0',
  });

  await socketService.emit(null, 'order:processed', { orderId, status, totalAmount }, `order:${orderId}`);

  await notificationService.sendNotification({
    userId: order.customer_id,
    notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION,
    messageKey: 'order.confirmed',
    messageParams: { orderNumber: order.order_number, amount: totalAmount },
    role: 'customer',
    module: 'order',
    languageCode: order.customer?.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'order.confirmed', { orderNumber: order.order_number, amount: totalAmount }),
    data: { orderId, status, totalAmount },
  });
});

const applyDietaryPreferencesController = catchAsync(async (req, res) => {
  const { customerId, items } = req.body;
  const filteredItems = await applyDietaryPreferences(customerId, items);

  await auditService.logAction({
    userId: customerId,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.APPLY_DIETARY_PREFERENCES,
    details: { customerId, filteredItems: filteredItems.map(i => i.menu_item_id) },
    ipAddress: req.ip || '0.0.0.0',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'order.dietaryPreferencesApplied'),
    data: filteredItems,
  });
});

const updateOrderStatusController = catchAsync(async (req, res) => {
  const { orderId, status } = req.body;
  const { orderId: updatedOrderId, status: newStatus } = await updateOrderStatus(orderId, status);

  const order = await Order.findByPk(updatedOrderId, { include: [{ model: Customer, as: 'customer' }] });

  await socketService.emit(null, 'order:status_updated', { orderId, status: newStatus }, `order:${orderId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS,
    details: { orderId, status: newStatus },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: order.customer_id,
    notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
    messageKey: `order.status.${status}`,
    messageParams: { orderNumber: order.order_number },
    role: 'customer',
    module: 'order',
    languageCode: order.customer?.preferred_language || 'en',
  });

  if (newStatus === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5]) {
    await pointService.awardPoints({
      userId: order.customer_id,
      role: 'customer',
      action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'order_completed').action,
      languageCode: order.customer?.preferred_language || 'en',
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', `order.status.${status}`, { orderNumber: order.order_number }),
    data: { orderId, status: newStatus },
  });
});

const payOrderWithWalletController = catchAsync(async (req, res) => {
  const { orderId, walletId } = req.body;
  const { orderId: paidOrderId, paymentStatus, amount } = await payOrderWithWallet(orderId, walletId);

  const order = await Order.findByPk(paidOrderId, { include: [{ model: Customer, as: 'customer' }] });

  const paymentResult = await walletService.debitWallet({
    walletId,
    userId: order.customer_id,
    amount: order.total_amount,
    currency: 'USD', // Assume default currency
    transactionType: 'order_payment',
    description: `Payment for order ${order.order_number}`,
  });

  await auditService.logAction({
    userId: order.customer_id,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.PAY_ORDER_WITH_WALLET,
    details: { orderId, walletId, amount },
    ipAddress: req.ip || '0.0.0.0',
  });

  await socketService.emit(null, 'order:payment_processed', { orderId, paymentStatus }, `order:${orderId}`);

  await notificationService.sendNotification({
    userId: order.customer_id,
    notificationType: munchConstants.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
    messageKey: 'order.paymentConfirmed',
    messageParams: { orderNumber: order.order_number, amount },
    role: 'customer',
    module: 'order',
    languageCode: order.customer?.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'order.paymentConfirmed', { orderNumber: order.order_number, amount }),
    data: paymentResult,
  });
});

module.exports = {
  processOrderController,
  applyDietaryPreferencesController,
  updateOrderStatusController,
  payOrderWithWalletController,
};