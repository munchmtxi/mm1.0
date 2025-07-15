'use strict';

const { Op } = require('sequelize');
const { Order, Customer, Driver, User, Wallet, WalletTransaction, TimeWindow } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const customerConstants = require('@constants/customer/customerConstants');
const notificationService = require('@services/common/notificationService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function trackDeliveryStatus(orderId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
      { model: TimeWindow, as: 'timeWindow' },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (!order.driver_id) {
    throw new AppError(
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED,
      400,
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED
    );
  }

  if (order.status !== munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.includes(order.status)) {
    throw new AppError(
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS,
      400,
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS
    );
  }

  const driverLocation = order.driver.current_location
    ? await locationService.resolveLocation(order.driver.current_location)
    : null;

  const timeWindowInfo = order.timeWindow
    ? {
        interval: order.timeWindow.interval,
        optimalWindow: order.timeWindow.optimalWindow,
        averageDuration: order.timeWindow.averageDuration,
        trafficConditions: order.timeWindow.trafficConditions,
      }
    : null;

  logger.info(munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS, {
    orderId,
    status: order.status,
    timeWindow: timeWindowInfo?.interval,
  });

  return {
    orderId: order.id,
    status: order.status,
    estimatedDeliveryTime: order.estimated_delivery_time,
    actualDeliveryTime: order.actual_delivery_time,
    deliveryDistance: order.delivery_distance,
    driver: {
      name: order.driver.name,
      phone: order.driver.format_phone_for_whatsapp(),
      location: driverLocation ? driverLocation.coordinates : null,
      vehicleInfo: order.driver.vehicle_info,
      rating: order.driver.rating,
      availabilityStatus: order.driver.availability_status,
    },
    customer: {
      name: order.customer.user.getFullName(),
      phone: order.customer.format_phone_for_whatsapp(),
    },
    deliveryLocation: order.delivery_location,
    timeWindow: timeWindowInfo,
    isFeedbackRequested: order.is_feedback_requested,
    lastUpdated: order.updated_at,
  };
}

async function cancelDelivery(orderId, userId, reason, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.customer.user_id !== userId) {
    throw new AppError(
      customerConstants.ERROR_CODES.PERMISSION_DENIED,
      403,
      customerConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  if (order.status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6]) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED,
      400,
      munchConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED
    );
  }

  if (
    [munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5], munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4]].includes(
      order.status
    )
  ) {
    throw new AppError(
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER,
      400,
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
    );
  }

  const cancellationWindow = munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.CANCELLATION_WINDOW_MINUTES;
  const orderAge = (new Date() - new Date(order.created_at)) / (1000 * 60);
  if (orderAge > cancellationWindow) {
    throw new AppError(
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER,
      400,
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
    );
  }

  await order.update(
    {
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6],
      cancellation_reason: reason?.substring(0, 500),
      cancelled_at: new Date(),
    },
    { transaction }
  );

  let refundProcessed = false;
  let wallet = null;
  let walletTransaction = null;

  if (order.payment_status === customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1]) {
    wallet = await Wallet.findOne({
      where: { user_id: order.customer.user_id, type: customerConstants.WALLET_CONSTANTS.WALLET_TYPE },
      transaction,
    });

    if (!wallet) {
      throw new AppError(
        customerConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS,
        404,
        customerConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS
      );
    }

    const refundAmount = order.total_amount;
    if (refundAmount < customerConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_DEPOSIT_AMOUNT) {
      throw new AppError(
        customerConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS,
        400,
        customerConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS
      );
    }

    await wallet.update(
      { balance: wallet.balance + refundAmount },
      { transaction }
    );

    walletTransaction = await WalletTransaction.create(
      {
        wallet_id: wallet.id,
        type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[6], // refund
        amount: refundAmount,
        currency: order.currency,
        status: customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[3], // refunded
        description: `Refund for cancelled order #${order.order_number}`,
      },
      { transaction }
    );

    refundProcessed = true;

    await notificationService.sendNotification({
      userId: order.customer.user_id,
      type: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
      message: munchConstants.SUCCESS_MESSAGES[1], // Order cancelled
      data: { orderId, reason, refundAmount },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2], // high
    });

    if (order.driver_id) {
      await notificationService.sendNotification({
        userId: order.driver.user_id,
        type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // delivery_task_assigned
        message: driverConstants.SUCCESS_MESSAGES[2], // delivery_completed
        data: { orderId, reason },
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2], // high
      });
    }
  }

  logger.info(munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE, {
    orderId,
    userId,
    refundProcessed,
    refundAmount: refundProcessed ? order.total_amount : 0,
  });

  return { order, wallet, walletTransaction, refundAmount: order.total_amount, refundProcessed };
}

async function communicateWithDriver(orderId, userId, message, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.customer.user_id !== userId) {
    throw new AppError(
      customerConstants.ERROR_CODES.PERMISSION_DENIED,
      403,
      customerConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  if (!order.driver_id) {
    throw new AppError(
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED,
      400,
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED
    );
  }

  const sanitizedMessage = message.trim().substring(0, 500);

  await notificationService.sendNotification({
    userId: order.driver.user_id,
    type: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
    message: munchConstants.SUCCESS_MESSAGES[3], // Driver message sent
    data: { orderId, message: sanitizedMessage, customerName: order.customer.user.getFullName() },
    priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  });

  logger.info(munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER, {
    orderId,
    driverId: order.driver_id,
    messageLength: sanitizedMessage.length,
  });

  return {
    orderId,
    message: sanitizedMessage,
    sentAt: new Date(),
    sender: order.customer.user.getFullName(),
    recipient: order.driver.name,
  };
}

async function requestDeliveryFeedback(orderId, userId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] }],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.customer.user_id !== userId) {
    throw new AppError(
      customerConstants.ERROR_CODES.PERMISSION_DENIED,
      403,
      customerConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5]) {
    throw new AppError(
      munchConstants.ERROR_CODES.FEEDBACK_NOT_ALLOWED,
      400,
      munchConstants.ERROR_CODES.FEEDBACK_NOT_ALLOWED
    );
  }

  if (order.is_feedback_requested) {
    throw new AppError(
      munchConstants.ERROR_CODES.FEEDBACK_ALREADY_REQUESTED,
      400,
      munchConstants.ERROR_CODES.FEEDBACK_ALREADY_REQUESTED
    );
  }

  await order.update({ is_feedback_requested: true }, { transaction });

  await notificationService.sendNotification({
    userId: order.customer.user_id,
    type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], // feedback_confirmation
    message: customerConstants.SUCCESS_MESSAGES[0], // customer_registered
    data: { orderId },
    priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  });

  logger.info(munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY, { orderId, action: 'feedback_requested' });

  return { orderId, feedbackRequested: true, requestedAt: new Date() };
}

async function updateDeliveryStatus(orderId, driverId, newStatus, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.driver_id !== driverId) {
    throw new AppError(
      driverConstants.ERROR_CODES.PERMISSION_DENIED,
      403,
      driverConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  if (!munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.includes(newStatus)) {
    throw new AppError(
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS,
      400,
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS
    );
  }

  if (
    newStatus === munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[4] && // delivered
    order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4] // out_for_delivery
  ) {
    throw new AppError(
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS,
      400,
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS
    );
  }

  const updates = { status: newStatus };
  if (newStatus === munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[4]) {
    updates.actual_delivery_time = new Date();
  }

  await order.update(updates, { transaction });

  await notificationService.sendNotification({
    userId: order.customer.user_id,
    type: munchConstants.NOTIFICATION_TYPES.DELIVERY_STATUS_UPDATED,
    message: munchConstants.SUCCESS_MESSAGES[2], // Delivery tracked
    data: { orderId, status: newStatus },
    priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2], // high
  });

  logger.info(munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS, {
    orderId,
    driverId,
    newStatus,
  });

  return { orderId, status: newStatus, updatedAt: order.updated_at };
}

async function processDriverEarnings(orderId, driverId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] }],
    transaction,
  });

  if (!order) {
    throw new AppError(
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND,
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }

  if (order.driver_id !== driverId) {
    throw new AppError(
      driverConstants.ERROR_CODES.PERMISSION_DENIED,
      403,
      driverConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  if (order.status !== munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[4]) {
    throw new AppError(
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS,
      400,
      munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS
    );
  }

  const wallet = await Wallet.findOne({
    where: { user_id: order.driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
    transaction,
  });

  if (!wallet) {
    throw new AppError(
      driverWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0], // WALLET_INSUFFICIENT_FUNDS
      404,
      driverWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]
    );
  }

  const earningAmount = order.total_amount * 0.7; // Example: 70% of order amount as driver earnings
  if (earningAmount < driverWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_PAYOUT) {
    throw new AppError(
      driverWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0], // WALLET_INSUFFICIENT_FUNDS
      400,
      driverWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]
    );
  }

  await wallet.update(
    { balance: wallet.balance + earningAmount },
    { transaction }
  );

  const walletTransaction = await WalletTransaction.create(
    {
      wallet_id: wallet.id,
      type: driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[1], // delivery_earning
      amount: earningAmount,
      currency: order.currency,
      status: driverWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
      description: `Earnings for delivery order #${order.order_number}`,
    },
    { transaction }
  );

  await notificationService.sendNotification({
    userId: order.driver.user_id,
    type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[3], // tip_received
    message: driverWalletConstants.WALLET_CONSTANTS.SUCCESS_MESSAGES[1], // payout_processed
    data: { orderId, earningAmount },
    priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
  });

  logger.info(driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2], {
    orderId,
    driverId,
    earningAmount,
  });

  return { orderId, driverId, earningAmount, walletTransaction };
}

module.exports = {
  trackDeliveryStatus,
  cancelDelivery,
  communicateWithDriver,
  requestDeliveryFeedback,
  updateDeliveryStatus,
  processDriverEarnings,
};