'use strict';

const { sequelize } = require('@models');
const deliveryService = require('@services/customer/munch/deliveryService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const trackDeliveryStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { customerId } = req.user;
  const transaction = await sequelize.transaction();
  try {
    const status = await deliveryService.trackDeliveryStatus(orderId, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'delivery_tracked').action, {
      io: req.app.get('socketio'),
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await auditService.logAction({
      action: 'TRACK_DELIVERY',
      userId: customerId,
      role: 'customer',
      details: `Tracked delivery for order_id: ${orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Delivery status retrieved', { orderId, customerId });
    res.status(200).json({ status: 'success', data: status });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const cancelDelivery = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  const { customerId } = req.user;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { order, wallet, refundAmount } = await deliveryService.cancelDelivery(orderId, transaction);
    if (refundAmount) {
      await walletService.processTransaction(wallet.id, {
        type: paymentConstants.TRANSACTION_TYPES[2],
        amount: refundAmount,
        currency: order.currency,
      }, transaction);
    }
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'delivery_cancellation').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_cancelled,
      messageKey: 'order.cancelled',
      messageParams: { orderId: order.id },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    });
    await socketService.emit(io, 'delivery:cancelled', {
      orderId: order.id,
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6],
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'CANCEL_DELIVERY',
      userId: customerId,
      role: 'customer',
      details: `Cancelled delivery for order_id: ${orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Delivery cancelled', { orderId, customerId });
    res.status(200).json({
      status: 'success',
      data: {
        orderId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6],
        refundProcessed: !!refundAmount,
      }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const communicateWithDriver = catchAsync(async (req, res) => {
  const { orderId, message } = req.body;
  const { customerId } = req.user;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await deliveryService.communicateWithDriver(orderId, message, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'driver_communication').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.driver_message,
      messageKey: 'driver.message_sent',
      messageParams: { orderId, message },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    });
    await socketService.emit(io, 'driver:communicated', {
      orderId,
      message: result.message,
      customerId
    }, `driver:${(await Order.findByPk(orderId)).driver_id}`);
    await auditService.logAction({
      action: 'COMMUNICATE_WITH_DRIVER',
      userId: customerId,
      role: 'customer',
      details: `Sent message for order_id: ${orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Message sent to driver', { orderId, customerId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { trackDeliveryStatus, cancelDelivery, communicateWithDriver };