// deliveryController.js
// Handles delivery-related requests for munch staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const deliveryService = require('@services/staff/munch/deliveryService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff, Customer, Driver } = require('@models');

async function assignDriver(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const { order, driver } = await deliveryService.assignDriver(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY,
      details: { orderId: order.id, driverId: driver.id, action: 'assign_driver' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverAssigned.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.driverAssigned.points,
      details: { orderId: order.id, driverId: driver.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      driverId: driver.id,
      notificationType: munchConstants.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      messageKey: 'munch.driver_assigned',
      messageParams: { orderNumber: order.order_number },
      role: 'customer,driver',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:delivery:assigned`, {
      orderId: order.id,
      order_number: order.order_number,
      driverId: driver.id,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.driver_assigned', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function prepareDeliveryPackage(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const order = await deliveryService.prepareDeliveryPackage(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_ORDER,
      details: { orderId: order.id, action: 'prepare_package' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.packagePrepared.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.packagePrepared.points,
      details: { orderId: order.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
      messageKey: 'munch.package_ready',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:delivery:package_ready`, {
      orderId: order.id,
      status: order.status,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.package_ready', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function trackDriverStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const io = req.app.get('io');

    const status = await deliveryService.trackDriverStatus(orderId);

    socketService.emit(io, `staff:munch:delivery:driver_status`, status, `order:${orderId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.driver_status_tracked', { orderId }, munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assignDriver,
  prepareDeliveryPackage,
  trackDriverStatus,
};