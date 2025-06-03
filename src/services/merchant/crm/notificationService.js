'use strict';

/**
 * notificationService.js
 * Manages customer, staff, and driver notifications with gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Customer, Staff, Driver, Merchant, Notification, GamificationPoints, AuditLog } = require('@models');

/**
 * Sends booking or order alerts to a customer.
 * @param {number} customerId - Customer ID.
 * @param {Object} message - Message details (type, content, orderId, bookingId).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function sendCustomerAlert(customerId, message, io) {
  try {
    if (!customerId || !message?.type || !message?.content) {
      throw new Error('Customer ID, message type, and content required');
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const validTypes = ['order_update', 'booking_update'];
    if (!validTypes.includes(message.type)) throw new Error('Invalid message type');

    const notification = await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: message.type,
      messageKey: `notifications.${message.type}`,
      messageParams: { content: message.content },
      data: { orderId: message.orderId, bookingId: message.bookingId },
      deliveryMethod: customer.preferences?.notificationMethod || 'push',
      role: 'customer',
      module: 'notifications',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'send_customer_alert',
      details: { customerId, messageType: message.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'notifications:customerAlert', {
      customerId,
      notificationId: notification.notificationId,
    }, `customer:${customerId}`);

    return notification;
  } catch (error) {
    logger.error('Error sending customer alert', { error: error.message });
    throw error;
  }
}

/**
 * Delivers task or schedule alerts to a staff member.
 * @param {number} staffId - Staff ID.
 * @param {Object} message - Message details (type, content, taskId).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function sendStaffNotification(staffId, message, io) {
  try {
    if (!staffId || !message?.type || !message?.content) {
      throw new Error('Staff ID, message type, and content required');
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error('Staff not found');

    const validTypes = ['task_assignment', 'schedule_update'];
    if (!validTypes.includes(message.type)) throw new Error('Invalid message type');

    const notification = await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: message.type,
      messageKey: `notifications.${message.type}`,
      messageParams: { content: message.content },
      data: { taskId: message.taskId },
      deliveryMethod: staff.preferences?.notificationMethod || 'push',
      role: 'staff',
      module: 'notifications',
      languageCode: staff.user?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'send_staff_notification',
      details: { staffId, messageType: message.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'notifications:staffNotification', {
      staffId,
      notificationId: notification.notificationId,
    }, `staff:${staffId}`);

    return notification;
  } catch (error) {
    logger.error('Error sending staff notification', { error: error.message });
    throw error;
  }
}

/**
 * Sends delivery task alerts to a driver.
 * @param {number} driverId - Driver ID.
 * @param {Object} message - Message details (type, content, orderId).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function sendDriverNotification(driverId, message, io) {
  try {
    if (!driverId || !message?.type || !message?.content) {
      throw new Error('Driver ID, message type, and content required');
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) throw new Error('Driver not found');

    const validTypes = ['delivery_assignment', 'delivery_update'];
    if (!validTypes.includes(message.type)) throw new Error('Invalid message type');

    const notification = await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: message.type,
      messageKey: `notifications.${message.type}`,
      messageParams: { content: message.content },
      data: { orderId: message.orderId },
      deliveryMethod: driver.preferences?.notificationMethod || 'push',
      role: 'driver',
      module: 'notifications',
      languageCode: driver.user?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'send_driver_notification',
      details: { driverId, messageType: message.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'notifications:driverNotification', {
      driverId,
      notificationId: notification.notificationId,
    }, `driver:${driverId}`);

    return notification;
  } catch (error) {
    logger.error('Error sending driver notification', { error: error.message });
    throw error;
  }
}

/**
 * Awards notification interaction points for customers.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackNotificationGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'notification_interaction',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_notification_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'notifications:pointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'notification_points_awarded',
      messageKey: 'notifications.notification_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'notifications',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking notification gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  sendCustomerAlert,
  sendStaffNotification,
  sendDriverNotification,
  trackNotificationGamification,
};