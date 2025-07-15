'use strict';

const { Order, Customer, Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function acceptDelivery(deliveryId, driverId, auditService, notificationService, socketService, pointService) {
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
      notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      message: formatMessage(
        'customer',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.assigned',
        { deliveryId }
      ),
      priority: 'HIGH',
    });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'delivery_completion').action,
      languageCode: munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
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

async function getDeliveryDetails(deliveryId, auditService, pointService) {
  const order = await Order.findByPk(deliveryId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'] },
      { model: Route, as: 'route' },
    ],
  });
  if (!order) throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

  await auditService.logAction({
    userId: 'system',
    role: 'driver',
    action: 'GET_DELIVERY_DETAILS',
    details: { deliveryId },
    ipAddress: 'unknown',
  });

  await pointService.awardPoints({
    userId: 'system',
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'delivery_details_access').action,
    languageCode: munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
  });

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

async function updateDeliveryStatus(deliveryId, status, driverId, auditService, notificationService, socketService, pointService) {
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
      await pointService.awardPoints({
        userId: driver.user_id,
        role: 'driver',
        action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'delivery_completion').action,
        languageCode: munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      });
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
      notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_STATUS_UPDATED,
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

async function communicateWithCustomer(deliveryId, message, driverId, auditService, notificationService, socketService) {
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
    notificationType: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
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

module.exports = {
  acceptDelivery,
  getDeliveryDetails,
  updateDeliveryStatus,
  communicateWithCustomer,
};