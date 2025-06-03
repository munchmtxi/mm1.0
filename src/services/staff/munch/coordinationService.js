'use strict';

/**
 * coordinationService.js
 * Manages delivery coordination for munch (staff role). Arranges driver pickups, verifies credentials,
 * logs pickup times, and awards points. Excludes taxi-related operations.
 * Last Updated: May 25, 2025
 */

const { Order, Driver, Verification, TimeTracking, GamificationPoints, Staff, Geofence, RouteOptimization, DriverAvailability } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const merchantConstants = require('@constants/staff/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Arranges driver pickups (FOH/BOH).
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function coordinateDriverPickup(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId, { include: ['customer', 'branch'] });
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const availableDriver = await Driver.findOne({
      where: { availability_status: 'available' },
      include: [{
        model: DriverAvailability,
        where: {
          status: 'available',
          isOnline: true,
          date: sequelize.literal('CURRENT_DATE'),
          start_time: { [Op.lte]: sequelize.literal('CURRENT_TIME') },
          end_time: { [Op.gte]: sequelize.literal('CURRENT_TIME') },
        },
      }],
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

    await DriverAvailability.update(
      { status: 'busy', lastUpdated: new Date() },
      { where: { driver_id: availableDriver.id, status: 'available' } }
    );

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, driverId: availableDriver.id, action: 'coordinate_pickup' },
      ipAddress,
    });

    const message = localization.formatMessage('coordination.pickup_coordinated', {
      orderNumber: order.order_number,
      driverName: availableDriver.name,
    });
    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: availableDriver.id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY,
      message,
      role: 'customer,driver',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:coordination:${order.id}`, 'coordination:pickup_coordinated', {
      orderId: order.id,
      orderNumber: order.order_number,
      driverId: availableDriver.id,
    });

    return order;
  } catch (error) {
    logger.error('Driver pickup coordination failed', { error: error.message, orderId });
    throw new AppError(`Pickup coordination failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Confirms driver identity (BOH).
 * @param {number} driverId - Driver ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Verification result.
 */
async function verifyDriverCredentials(driverId, staffId, ipAddress) {
  try {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('read')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const verification = await Verification.create({
      user_id: driverId,
      role: 'driver',
      verification_type: 'identity',
      status: 'verified',
      details: { driverId, verifiedBy: staffId },
      verified_by: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { driverId, action: 'verify_credentials', verificationId: verification.id },
      ipAddress,
    });

    const message = localization.formatMessage('coordination.credentials_verified', {
      driverName: driver.name,
    });
    await notificationService.sendNotification({
      driverId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY,
      message,
      role: 'driver',
      module: 'munch',
    });

    socketService.emit(`munch:coordination:driver:${driverId}`, 'coordination:credentials_verified', {
      driverId,
      verificationId: verification.id,
    });

    return verification;
  } catch (error) {
    logger.error('Driver credentials verification failed', { error: error.message, driverId });
    throw new AppError(`Credentials verification failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Records pickup time for gamification.
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Time tracking record.
 */
async function logPickupTime(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const pickupTime = new Date();
    const timeTracking = await TimeTracking.create({
      staff_id: staffId,
      clock_in: pickupTime,
      duration: 0,
      created_at: pickupTime,
      updated_at: pickupTime,
    });

    await order.update({ updated_at: pickupTime });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, action: 'log_pickup_time', timeTrackingId: timeTracking.id },
      ipAddress,
    });

    const message = localization.formatMessage('coordination.pickup_logged', {
      orderNumber: order.order_number,
    });
    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: order.driver_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY,
      message,
      role: 'customer,driver',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:coordination:${order.id}`, 'coordination:pickup_logged', {
      orderId: order.id,
      timeTrackingId: timeTracking.id,
      pickupTime,
    });

    return timeTracking;
  } catch (error) {
    logger.error('Pickup time logging failed', { error: error.message, orderId });
    throw new AppError(`Pickup time logging failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Awards points for coordination tasks.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardCoordinationPoints(staffId) {
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
    logger.error('Coordination points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

module.exports = {
  coordinateDriverPickup,
  verifyDriverCredentials,
  logPickupTime,
  awardCoordinationPoints,
};