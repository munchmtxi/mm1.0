// orderController.js
// Handles order-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const orderService = require('@services/staff/mtables/orderService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Booking, Table, Staff, Customer } = require('@models');

async function processExtraOrder(req, res, next) {
  try {
    const { bookingId, items, staffId } = req.body;
    const io = req.app.get('io');

    const order = await orderService.processExtraOrder(bookingId, items, staffId);

    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_create,
      details: { orderId: order.id, orderNumber: order.order_number, totalAmount: order.total_amount },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.extraOrderProcessed.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.extraOrderProcessed.points,
      details: { orderId: order.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
      messageKey: 'mtables.order_created',
      messageParams: { orderNumber: order.order_number, tableNumber: booking.table.table_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(booking.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:order_created`, {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
    }, `customer:${booking.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.order_created', { orderNumber: order.order_number, tableNumber: booking.table.table_number }, (await Customer.findByPk(booking.customer_id)).preferred_language || 'en'),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function prepareDineInOrder(req, res, next) {
  try {
    const { orderId, items, staffId } = req.body;
    const io = req.app.get('io');

    const order = await orderService.prepareDineInOrder(orderId, items, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { orderId, action: 'prepare' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderStatusUpdated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderStatusUpdated.points,
      details: { orderId, preparationStatus: order.preparation_status },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
      messageKey: 'mtables.order_preparing',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:order_status_updated`, {
      orderId,
      status: order.preparation_status,
    }, `customer:${order.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.order_preparing', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || 'en'),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function logOrderMetrics(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    await orderService.logOrderMetrics(orderId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { orderId, action: 'log_order_metrics' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.salesTracked.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.salesTracked.points,
      details: { orderId },
    });

    socketService.emit(io, `staff:mtables:metrics_logged`, {
      orderId,
      staffId,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.metrics_logged', { orderId }, (await Staff.findByPk(staffId)).preferred_language || 'en'),
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processExtraOrder,
  prepareDineInOrder,
  logOrderMetrics,
};