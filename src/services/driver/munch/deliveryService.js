'use strict';

/**
 * Driver Delivery Service
 * Manages driver-side food delivery operations, including accepting deliveries, retrieving details,
 * updating status, communicating with customers, and awarding gamification points. Integrates with common services.
 */

const { Order, Customer, Driver, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const munchConstants = require('@constants/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

/**
 * Accepts a delivery request.
 * @param {number} deliveryId - Order ID representing the delivery.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Updated order object.
 */
async function acceptDelivery(deliveryId, driverId) {
  const order = await Order.findByPk(deliveryId, { include: [{ model: Customer, as: 'customer' }] });
  if (!order) throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  if (order.status !== munchConstants.ORDER_STATUSES.READY || order.driver_id) {
    throw new AppError('Delivery cannot be accepted', 400, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver || driver.availability_status !== 'available') {
    throw new AppError('Driver unavailable', 400, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const transaction = await sequelize.transaction();
  try {
    await order.update(
      {
        status: munchConstants.ORDER_STATUSES.OUT_FOR_DELIVERY,
        driver_id: driverId,
        updated_at: new Date(),
      },
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'ACCEPT_DELIVERY',
      details: { deliveryId, customerId: order.customer_id },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: order.customer.user_id,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      message: formatMessage(
        'customer',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.assigned',
        { deliveryId }
      ),
      priority: 'HIGH',
    });

    socketService.emit(null, 'delivery:accepted', { deliveryId, driverId, customerId: order.customer_id });

    await transaction.commit();
    logger.info('Delivery accepted', { deliveryId, driverId });
    return order;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Accept delivery failed: ${error.message}`, 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Retrieves delivery information.
 * @param {number} deliveryId - Order ID representing the delivery.
 * @returns {Promise<Object>} Delivery details.
 */
async function getDeliveryDetails(deliveryId) {
  const order = await Order.findByPk(deliveryId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'] },
      { model: Route, as: 'route' },
    ],
  });
  if (!order) throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

  logger.info('Delivery details retrieved', { deliveryId });
  return {
    deliveryId: order.id,
    customer: order.customer,
    deliveryLocation: order.delivery_location,
    status: order.status,
    items: order.items,
    totalAmount: order.total_amount,
    currency: order.currency,
    route: order.route,
    estimatedDeliveryTime: order.estimated_delivery_time,
  };
}

/**
 * Updates delivery progress.
 * @param {number} deliveryId - Order ID representing the delivery.
 * @param {string} status - New status.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<void>}
 */
async function updateDeliveryStatus(deliveryId, status, driverId) {
  const validStatuses = Object.values(munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES);
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const order = await Order.findByPk(deliveryId);
  if (!order) throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  if (order.driver_id !== driverId) {
    throw new AppError('Unauthorized driver', 403, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const transaction = await sequelize.transaction();
  try {
    const updates = { status, updated_at: new Date() };
    if (status === munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.DELIVERED) {
      updates.actual_delivery_time = new Date();
    }
    await order.update(updates, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_DELIVERY_STATUS',
      details: { deliveryId, status },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY_UPDATE,
      message: formatMessage(
        'customer',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.status_updated',
        { deliveryId, status }
      ),
      priority: 'MEDIUM',
    });

    socketService.emit(null, 'delivery:status_updated', { deliveryId, status, driverId });

    await transaction.commit();
    logger.info('Delivery status updated', { deliveryId, status });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update delivery status failed: ${error.message}`, 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Sends/receives messages between driver and customer.
 * @param {number} deliveryId - Order ID representing the delivery.
 * @param {string} message - Message content.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<void>}
 */
async function communicateWithCustomer(deliveryId, message, driverId) {
  const order = await Order.findByPk(deliveryId);
  if (!order) throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  if (order.driver_id !== driverId) {
    throw new AppError('Unauthorized driver', 403, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'DRIVER_MESSAGE_SENT',
    details: { deliveryId, message },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: order.customer_id,
    notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DRIVER_MESSAGE,
    message: formatMessage(
      'customer',
      'delivery',
      munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      'delivery.message_received',
      { message }
    ),
    priority: 'HIGH',
  });

  socketService.emit(null, 'delivery:message', {
    deliveryId,
    message,
    sender: 'driver',
    driverId,
    customerId: order.customer_id,
  });

  logger.info('Message sent to customer', { deliveryId, driverId });
}

/**
 * Awards gamification points for delivery completion.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardDeliveryPoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

  const completedDeliveries = await Order.count({
    where: {
      driver_id: driverId,
      status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.DELIVERED,
      updated_at: { [Op.gte]: sequelize.literal('CURRENT_DATE') },
    },
  });
  if (completedDeliveries === 0) {
    throw new AppError('No completed deliveries today', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const pointsRecord = await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: munchConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.DELIVERY_COMPLETED.action,
    languageCode: munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Delivery points awarded', { driverId, points: pointsRecord.points });
  return pointsRecord;
}

module.exports = {
  acceptDelivery,
  getDeliveryDetails,
  updateDeliveryStatus,
  communicateWithCustomer,
  awardDeliveryPoints,
};