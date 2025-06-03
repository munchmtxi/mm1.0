// src/services/driverCommunicationService.js
'use strict';

const { Driver, Order, Merchant, NotificationLog, Task } = require('@models');
const driverConstants = require('@constants/driverConstants');
const staffConstants = require('@constants/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class DriverCommunicationService {
  static async sendDriverMessage(driverId, message, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', 'en', 'driverCommunication.errors.driverNotFound'),
          404,
          'DRIVER_NOT_FOUND'
        );
      }

      const deliveryMethod = driver.phone_number ? driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.SMS : driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.IN_APP;

      const task = await Task.findOne({
        where: { staff_id: driver.user_id, task_type: 'delivery', status: staffConstants.STAFF_TASK_STATUSES.ASSIGNED },
      });

      await notificationService.sendNotification({
        userId: driver.user_id,
        notificationType: 'driver_message_sent',
        messageKey: 'driverCommunication.driverMessage',
        messageParams: { message, taskId: task ? task.id : 'N/A' },
        deliveryMethod,
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
        role: driver.merchant_id ? 'staff' : 'driver',
        module: 'notifications',
      });

      const log = await NotificationLog.create({
        user_id: driver.user_id,
        notification_id: null,
        type: deliveryMethod.toUpperCase(),
        recipient: driver.phone_number || driver.user_id.toString(),
        content: message,
        status: 'SENT',
        created_at: new Date(),
      });

      await auditService.logAction({
        userId: driver.user_id,
        role: driver.merchant_id ? 'staff' : 'driver',
        action: 'driver_message_sent',
        details: { driverId, message, logId: log.id, taskId: task ? task.id : null },
        ipAddress,
      });

      socketService.emit(null, 'communication:driverMessageSent', {
        userId: driver.user_id,
        driverId,
        message,
        taskId: task ? task.id : null,
      });

      logger.info(`Message sent to driver ${driverId}`);
      return { log, message };
    } catch (error) {
      throw handleServiceError('sendDriverMessage', error, 'EVENT_PROCESSING_FAILED');
    }
  }

  static async broadcastDeliveryUpdates(orderId, message, ipAddress) {
    try {
      const order = await Order.findByPk(orderId, { include: [{ model: Driver, as: 'driver' }] });
      if (!order || !order.driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', 'en', 'driverCommunication.errors.orderNotFound'),
          404,
          'ORDER_NOT_FOUND'
        );
      }

      const task = await Task.findOne({
        where: { staff_id: order.driver.user_id, task_type: 'delivery', status: staffConstants.STAFF_TASK_STATUSES.ASSIGNED },
      });

      await notificationService.sendNotification({
        userId: order.driver.user_id,
        notificationType: 'delivery_update_broadcast',
        messageKey: 'driverCommunication.deliveryUpdate',
        messageParams: { orderNumber: order.order_number, message, taskId: task ? task.id : 'N/A' },
        deliveryMethod: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
        orderId,
        role: order.driver.merchant_id ? 'staff' : 'driver',
        module: 'notifications',
      });

      const log = await NotificationLog.create({
        user_id: order.driver.user_id,
        notification_id: null,
        type: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH.toUpperCase(),
        recipient: order.driver.phone_number || order.driver.user_id.toString(),
        content: message,
        status: 'SENT',
        created_at: new Date(),
      });

      await auditService.logAction({
        userId: order.driver.user_id,
        role: order.driver.merchant_id ? 'staff' : 'driver',
        action: 'delivery_update_broadcast',
        details: { orderId, message, logId: log.id, orderNumber: order.order_number, taskId: task ? task.id : null },
        ipAddress,
      });

      socketService.emit(null, 'communication:deliveryUpdateBroadcast', {
        userId: order.driver.user_id,
        orderId,
        orderNumber: order.order_number,
        message,
        taskId: task ? task.id : null,
      });

      logger.info(`Delivery update broadcast for order ${orderId}`);
      return { log, message };
    } catch (error) {
      throw handleServiceError('broadcastDeliveryUpdates', error, 'EVENT_PROCESSING_FAILED');
    }
  }

  static async manageDriverChannels(merchantId, ipAddress) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError(
          formatMessage('driver', 'notifications', 'en', 'driverCommunication.errors.merchantNotFound'),
          404,
          'MERCHANT_NOT_FOUND'
        );
      }

      const drivers = await Driver.findAll({
        where: { merchant_id: merchantId, status: 'active' },
      });

      const tasks = await Task.findAll({
        where: {
          staff_id: drivers.map(driver => driver.user_id),
          task_type: 'delivery',
          status: staffConstants.STAFF_TASK_STATUSES.ASSIGNED,
        },
      });

      await auditService.logAction({
        userId: null,
        role: 'merchant',
        action: 'driver_channels_updated',
        details: { merchantId, driverCount: drivers.length, taskCount: tasks.length },
        ipAddress,
      });

      socketService.emit(null, 'communication:driverChannelsUpdated', {
        merchantId,
        driverIds: drivers.map(driver => driver.id),
        taskIds: tasks.map(task => task.id),
      });

      logger.info(`Driver channels updated for merchant ${merchantId}`);
      return { drivers: drivers.length, tasks: tasks.length };
    } catch (error) {
      throw handleServiceError('manageDriverChannels', error, 'EVENT_PROCESSING_FAILED');
    }
  }

  static async trackDriverCommunication(driverId, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', 'en', 'driverCommunication.errors.driverNotFound'),
          404,
          'DRIVER_NOT_FOUND'
        );
      }

      const logs = await NotificationLog.findAll({
        where: { user_id: driver.user_id },
        order: [['created_at', 'DESC']],
      });

      await auditService.logAction({
        userId: driver.user_id,
        role: driver.merchant_id ? 'staff' : 'driver',
        action: 'driver_communication_tracked',
        details: { driverId, logCount: logs.length },
        ipAddress,
      });

      logger.info(`Tracked communication for driver ${driverId}`);
      return { logs };
    } catch (error) {
      throw handleServiceError('trackDriverCommunication', error, 'EVENT_PROCESSING_FAILED');
    }
  }
}

module.exports = DriverCommunicationService;