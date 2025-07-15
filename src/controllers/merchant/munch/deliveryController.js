'use strict';

const { assignDelivery, trackDeliveryStatus, communicateWithDriver } = require('@services/merchant/munch/deliveryService');
const { Order, Driver } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

const assignDeliveryController = catchAsync(async (req, res) => {
  const { orderId, driverId } = req.body;
  const { orderId: assignedOrderId, status, driverId: assignedDriverId } = await assignDelivery(orderId, driverId);

  const order = await Order.findByPk(assignedOrderId);
  const driver = await Driver.findByPk(assignedDriverId);

  await notificationService.sendNotification({
    userId: driverId,
    notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
    messageKey: 'delivery.assigned',
    messageParams: { orderNumber: order.order_number },
    deliveryMethod: 'WHATSAPP',
    role: 'driver',
    module: 'delivery',
    languageCode: driver.preferred_language || 'en',
  });

  await socketService.emit(null, 'delivery:assigned', { orderId, driverId, status }, `driver:${driverId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY,
    details: { orderId, driverId },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  // Automate points if order is later completed
  if (status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5]) {
    const recentDeliveries = await Order.count({
      where: {
        driver_id: driverId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5],
        actual_delivery_time: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentDeliveries > 0) {
      await pointService.awardPoints({
        userId: driverId,
        role: 'driver',
        action: gamificationConstants.DRIVER_ACTIONS.find(a => a.action === 'delivery_completed').action,
        languageCode: driver.preferred_language || 'en',
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'delivery.assigned', { orderNumber: order.order_number }),
    data: { orderId, driverId, status },
  });
});

const trackDeliveryStatusController = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  const status = await trackDeliveryStatus(orderId);

  await socketService.emit(null, 'delivery:status_updated', status, `order:${orderId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS,
    details: { orderId, status },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'delivery.statusUpdated', { orderNumber: status.orderId }),
    data: status,
  });
});

const communicateWithDriverController = catchAsync(async (req, res) => {
  const { orderId, message } = req.body;
  const { orderId: resultOrderId, driverId, message: sanitizedMessage } = await communicateWithDriver(orderId, message);

  const order = await Order.findByPk(resultOrderId);
  const driver = await Driver.findByPk(driverId);

  await notificationService.sendNotification({
    userId: driverId,
    notificationType: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
    messageKey: 'delivery.message',
    messageParams: { message: sanitizedMessage, orderNumber: order.order_number },
    deliveryMethod: 'WHATSAPP',
    role: 'driver',
    module: 'delivery',
    languageCode: driver.preferred_language || 'en',
  });

  await socketService.emit(null, 'delivery:driver_message', { orderId, driverId, message: sanitizedMessage }, `driver:${driverId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
    details: { orderId, driverId, message: sanitizedMessage },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'delivery.message', { message: sanitizedMessage, orderNumber: order.order_number }),
    data: { orderId, driverId, message: sanitizedMessage },
  });
});

module.exports = {
  assignDeliveryController,
  trackDeliveryStatusController,
  communicateWithDriverController,
};