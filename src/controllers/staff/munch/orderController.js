// orderController.js
// Handles order-related requests for munch staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const orderService = require('@services/staff/munch/orderService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff, Customer } = require('@models');

async function confirmTakeawayOrder(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const order = await orderService.confirmTakeawayOrder(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_ORDER,
      details: { orderId: order.id, action: 'confirm_takeaway' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderConfirmed.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderConfirmed.points,
      details: { orderId: order.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION,
      messageKey: 'munch.order_confirmed',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:order:confirmed`, {
      orderId: order.id,
      status: order.status,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.order_confirmed', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function prepareDeliveryFood(req, res, next) {
  try {
    const { orderId, items, staffId } = req.body;
    const io = req.app.get('io');

    const order = await orderService.prepareDeliveryFood(orderId, items, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_ORDER,
      details: { orderId: order.id, action: 'prepare_food' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.foodPrepared.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.foodPrepared.points,
      details: { orderId: order.id, itemCount: items.length },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
      messageKey: 'munch.order_preparing',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:order:preparing`, {
      orderId: order.id,
      status: order.status,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.order_preparing', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function logOrderCompletion(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const order = await orderService.logOrderCompletion(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_ORDER,
      details: { orderId: order.id, action: 'complete_order' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: orderId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderCompleted.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.orderCompleted.points,
      details: { orderId: order.id },
    });

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
      messageKey: 'munch.order_completed',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:order:completed`, {
      orderId: order.id,
      status: order.status,
    }, `order:${order.id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.order_completed', { orderNumber: order.order_number }, (await Customer.findByPk(order.customer_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  confirmTakeawayOrder,
  prepareDeliveryFood,
  logOrderCompletion,
};