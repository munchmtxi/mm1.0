'use strict';

/**
 * deliveryService.js
 * Manages delivery operations for munch (staff role). Handles FOH handoffs, package preparation,
 * driver tracking, and point awarding.
 * Last Updated: May 25, 2025
 */

const { Order, Ride, OrderItems, Driver, GamificationPoints, Staff, Geofence, DriverAvailability, DriverEarnings } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const merchantConstants = require('@constants/staff/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localizationService = require('@services/common/localization');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Manages order handoffs (FOH).
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Updated order.
 */
async function assignDriver(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId, { include: ['driver'] });
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.MUNCH_CONSTANTS.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const availableDriver = await Driver.findOne({
      where: { availability_status: 'available' },
      include: [{ model: DriverAvailability, where: { status: 'available', isOnline: true } }],
    });
    if (!availableDriver) {
      throw new AppError('No available drivers', 404, merchantConstants.DRIVER_CONSTANTS.NO_AVAILABLE_DRIVERS);
    }

    const isWithinGeofence = await locationService.validateGeofence({
      driverId: availableDriver.id,
      orderId,
      location: order.delivery_location,
    });
    if (!isWithinGeofence) {
      throw new AppError('Driver outside geofence', 400, merchantConstants.DRIVER_CONSTANTS.INVALID_GEOFENCE);
    }

    await order.update({
      driver_id: availableDriver.id,
      status: 'out_for_delivery',
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, driverId: availableDriver.id, action: 'assign_driver' },
      ipAddress,
    });

    const message = localization.formatMessage('delivery.assigned', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: availableDriver.id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY,
      message,
      role: 'customer,driver',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:delivery:${order.id}`, 'delivery:assigned', {
      orderId: order.id,
      order_number: order.order_number,
      driverId: availableDriver.id,
    });

    return order;
  } catch (error) {
    logger.error('Delivery coordination failed', { error: error.message, orderId });
    throw new AppError(`Delivery coordination failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Assembles delivery packages (BOH).
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Updated order.
 */
async function prepareDeliveryPackage(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId, { include: ['orderItems'] });
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await order.order.update({ status: 'ready', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { orderId: order.id, action: 'prepare_package' },
      ipAddress,
    });

    const message = localization.formatMessage('delivery.package_ready', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY,
      message,
      role: 'customer',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:delivery:${order.id}`, 'delivery:package_ready', {
      orderId: order.id,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Delivery package failed', { error: error.message, orderId });
    throw new AppError(`Delivery package preparation failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Monitors driver progress.
 * @param {number} orderId - Order ID.
 * @returns {Promise<Object>} Driver status.
 */
async function trackDriverStatus(orderId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['driver'] });
    if (!order || !order.driver_id) {
      throw new AppError('Order or driver not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    const location = await locationService.getDriverLocation(order.driver_id);
    const status = {
      driverId: order.driver_id,
      location: location,
      status: order.status,
      lastUpdated: order.last_location_update || new Date(),
    };

    socketService.send(`munch:delivery:${orderId}`, 'driver:status', status);

    return status;
  } catch (error) {
    logger.error('Driver tracking failed', { error: error.message, orderId });
    throw new AppError(`Driver tracking failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Awards points for delivery coordination.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>} 
 */
async function awardDeliveryPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.DELIVERY_COMPLETION.action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.DELIVERY_COMPLETION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.DELIVERY_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Delivery points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

module.exports = {
  coordinateDelivery,
  prepareDeliveryPackage,
  trackDriverStatus,
  awardDeliveryPoints,
};