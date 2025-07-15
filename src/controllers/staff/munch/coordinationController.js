// coordinationController.js
// Handles coordination-related requests for munch staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const coordinationService = require('@services/staff/munch/coordinationService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff, Customer, Driver } = require('@models');

async function coordinateDriverPickup(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const { order, driver } = await coordinationService.coordinateDriverPickup(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY,
      details: { orderId: order.id, driverId: driver.id, action: 'coordinate_pickup' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverPickupCoordinated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverPickupCoordinated.points,
      details: { orderId: order.id, driverId: driver.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: driver.id,
      notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      messageKey: 'munch.pickup_coordinated',
      messageParams: { orderNumber: order.order_number, driverName: driver.name },
      role: 'customer,driver',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:coordination:pickup_coordinated`, {
      orderId: order.id,
      orderNumber: order.order_number,
      driverId: driver.id,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.pickup_coordinated', { orderNumber: order.order_number, driverName: driver.name }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyDriverCredentials(req, res, next) {
  try {
    const { driverId, staffId } = req.body;
    const io = req.app.get('io');

    const verification = await coordinationService.verifyDriverCredentials(driverId, staffId);

    const driver = await Driver.findByPk(driverId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      details: { driverId, action: 'verify_credentials', verificationId: verification.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverCredentialsVerified.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverCredentialsVerified.points,
      details: { driverId, verificationId: verification.id },
    });

    await notificationService.sendNotification({
      driverId,
      notificationType: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
      messageKey: 'munch.credentials_verified',
      messageParams: { driverName: driver.name },
      role: 'driver',
      module: 'munch',
      languageCode: driver.preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:coordination:credentials_verified`, {
      driverId,
      verificationId: verification.id,
    }, `driver:${driverId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.credentials_verified', { driverName: driver.name }, driver.preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: verification,
    });
  } catch (error) {
    next(error);
  }
}

async function logPickupTime(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const timeTracking = await coordinationService.logPickupTime(orderId, staffId);

    const order = await Order.findByPk(orderId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS,
      details: { orderId: order.id, action: 'log_pickup_time', timeTrackingId: timeTracking.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.pickupTimeLogged.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.pickupTimeLogged.points,
      details: { orderId: order.id, timeTrackingId: timeTracking.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: order.driver_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_STATUS_UPDATED,
      messageKey: 'munch.pickup_logged',
      messageParams: { orderNumber: order.order_number },
      role: 'customer,driver',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:coordination:pickup_logged`, {
      orderId: order.id,
      timeTrackingId: timeTracking.id,
      pickupTime: timeTracking.clock_in,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.pickup_logged', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: timeTracking,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  coordinateDriverPickup,
  verifyDriverCredentials,
  logPickupTime,
};