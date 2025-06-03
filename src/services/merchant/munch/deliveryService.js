'use strict';

/**
 * deliveryService.js
 * Manages delivery tasks, driver assignments, status tracking, communication, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
const { formatMessage } = require('@utils/localization/localization');
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Order, Driver, GamificationPoints, Notification, AuditLog, MerchantBranch, Customer } = require('@models');

/**
 * Assigns a delivery task to a driver.
 * @param {number} orderId - Order ID.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated order.
 */
async function assignDelivery(orderId, driverId, io) {
  try {
    if (!orderId || !driverId) throw new Error('Order ID and Driver ID required');

    const order = await Order.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'ready') throw new Error('Order not ready for delivery');

    const driver = await Driver.findByPk(driverId);
    if (!driver || driver.availability_status !== 'available') throw new Error('Driver unavailable');

    await order.update({ driver_id: driverId, status: 'out_for_delivery' });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'assign_delivery',
      details: { orderId, driverId },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'delivery:assigned', { orderId, driverId, status: 'out_for_delivery' }, `driver:${driverId}`);

    await notificationService.sendNotification({
      userId: driverId,
      notificationType: 'delivery_assignment',
      messageKey: 'delivery.assigned',
      messageParams: { orderNumber: order.order_number },
      deliveryMethod: 'WHATSAPP',
      role: 'driver',
      module: 'delivery',
      languageCode: driver.preferred_language || 'en',
    });

    return order;
  } catch (error) {
    logger.error('Error assigning delivery', { error: error.message });
    throw error;
  }
}

/**
 * Tracks real-time delivery progress.
 * @param {number} orderId - Order ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Delivery status.
 */
async function trackDeliveryStatus(orderId, io) {
  try {
    if (!orderId) throw new Error('Order ID required');

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Customer, as: 'customer' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!order) throw new Error('Order not found');

    let currentLocation = null;
    if (order.driver && order.driver.current_location) {
      currentLocation = await locationService.resolveLocation(order.driver.current_location);
    }

    const status = {
      orderId,
      status: order.status,
      driverId: order.driver_id,
      driverLocation: currentLocation?.coordinates,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time,
      deliveryLocation: order.delivery_location,
    };

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'track_delivery_status',
      details: { orderId, status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'delivery:statusUpdate', status, `order:${orderId}`);

    return status;
  } catch (error) {
    logger.error('Error tracking delivery status', { error: error.message });
    throw error;
  }
}

/**
 * Facilitates communication with a driver.
 * @param {number} orderId - Order ID.
 * @param {string} message - Message content.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function communicateWithDriver(orderId, message, io) {
  try {
    if (!orderId || !message) throw new Error('Order ID and message required');

    const order = await Order.findByPk(orderId, { include: [{ model: Driver, as: 'driver' }] });
    if (!order || !order.driver) throw new Error('Order or driver not found');

    const sanitizedMessage = message.trim();
    if (!sanitizedMessage) throw new Error('Invalid message');

    const notificationResult = await notificationService.sendNotification({
      userId: order.driver_id,
      notificationType: 'driver_communication',
      messageKey: 'delivery.message',
      messageParams: { message: sanitizedMessage, orderNumber: order.order_number },
      deliveryMethod: 'WHATSAPP',
      role: 'driver',
      module: 'delivery',
      languageCode: order.driver.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'communicate_with_driver',
      details: { orderId, driverId: order.driver_id, message: sanitizedMessage },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'delivery:driverMessage', {
      orderId,
      driverId: order.driver_id,
      message: sanitizedMessage,
    }, `driver:${order.driver_id}`);

    return notificationResult;
  } catch (error) {
    logger.error('Error communicating with driver', { error: error.message });
    throw error;
  }
}

/**
 * Awards gamification points for driver deliveries.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points record.
 */
async function logDeliveryGamification(driverId, io) {
  try {
    if (!driverId) throw new Error('Driver ID required');

    const driver = await Driver.findByPk(driverId);
    if (!driver) throw new Error('Driver not found');

    const recentDeliveries = await Order.count({
      where: {
        driver_id: driverId,
        status: 'completed',
        actual_delivery_time: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentDeliveries === 0) throw new Error('No recent deliveries');

    const pointsRecord = await pointService.awardPoints({
      userId: driverId,
      role: 'driver',
      action: 'delivery_completed',
      languageCode: driver.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'log_delivery_gamification',
      details: { driverId, points: pointsRecord.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'gamification:pointsAwarded', {
      driverId,
      points: pointsRecord.points,
      action: 'delivery_completed',
    }, `driver:${driverId}`);

    return pointsRecord;
  } catch (error) {
    logger.error('Error logging delivery gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  assignDelivery,
  trackDeliveryStatus,
  communicateWithDriver,
  logDeliveryGamification,
};