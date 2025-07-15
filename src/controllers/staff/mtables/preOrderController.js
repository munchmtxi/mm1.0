// preOrderController.js
// Handles pre-order-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const preOrderService = require('@services/staff/mtables/preOrderService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Booking, Table, Staff, Customer } = require('@models');

async function processPreOrder(req, res, next) {
  try {
    const { bookingId, items, staffId } = req.body;
    const io = req.app.get('io');

    const order = await preOrderService.processPreOrder(bookingId, items, staffId);

    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_create,
      details: { orderId: order.id, orderNumber: order.order_number, totalAmount: order.total_amount, isPreOrder: true },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderProcessed.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderProcessed.points,
      details: { orderId: order.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
      messageKey: 'mtables.pre_order_created',
      messageParams: { orderNumber: order.order_number, tableNumber: booking.table?.table_number || 'N/A' },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(booking.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:preorder_created`, {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
    }, `customer:${booking.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.pre_order_created', { orderNumber: order.order_number, tableNumber: booking.table?.table_number || 'N/A' }, (await Customer.findByPk(booking.customer_id)).preferred_language || 'en'),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function preparePreOrderedFood(req, res, next) {
  try {
    const { bookingId, items, staffId } = req.body;
    const io = req.app.get('io');

    const order = await preOrderService.preparePreOrderedFood(bookingId, items, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { orderId: order.id, action: 'prepare_pre_order' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderPrepared.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderPrepared.points,
      details: { orderId: order.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
      messageKey: 'mtables.pre_order_preparing',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:preorder_status_updated`, {
      orderId: order.id,
      status: order.preparation_status,
    }, `customer:${order.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.pre_order_preparing', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || 'en'),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function notifyPreOrderStatus(req, res, next) {
  try {
    const { bookingId, status, staffId } = req.body;
    const io = req.app.get('io');

    const order = await preOrderService.notifyPreOrderStatus(bookingId, status);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { orderId: order.id, status, action: 'notify_pre_order_status' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderStatusNotified.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.preOrderStatusNotified.points,
      details: { orderId: order.id, status },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
      messageKey: `mtables.pre_order_${status}`,
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:preorder_status_updated`, {
      orderId: order.id,
      status,
    }, `customer:${order.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage(`mtables.pre_order_${status}`, { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || 'en'),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processPreOrder,
  preparePreOrderedFood,
  notifyPreOrderStatus,
};