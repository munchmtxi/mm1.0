'use strict';

/**
 * orderService.js
 * Manages order operations for munch (staff role). Verifies takeaway orders, prepares food,
 * logs completion, and awards points.
 * Last Updated: May 25, 2025
 */

const { Order, OrderItems, TimeTracking, GamificationPoints, Staff, ProductDiscount, Promotion, PromotionRedemption } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const merchantConstants = require('@constants/staff/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Verifies takeaway orders (FOH).
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function confirmTakeawayOrder(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await order.update({ status: 'confirmed', staff_id: staffId, updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, action: 'confirm_takeaway' },
      ipAddress,
    });

    const message = localization.formatMessage('order.confirmed', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDER,
      message,
      role: 'customer',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:order:${order.id}`, 'order:confirmed', {
      orderId: order.id,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Takeaway order confirmation failed', { error: error.message, orderId });
    throw new AppError(`Order confirmation failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Prepares food for delivery (Kitchen).
 * @param {number} orderId - Order ID.
 * @param {Array} items - Order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function prepareDeliveryFood(orderId, items, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId, { include: ['orderItems'] });
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: order.id, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) {
        throw new AppError('Order item not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
      }
      await orderItem.update({ quantity: item.quantity, customization: item.customization });
    }

    await order.update({ status: 'preparing', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, action: 'prepare_food' },
      ipAddress,
    });

    const message = localization.formatMessage('order.preparing', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDER,
      message,
      role: 'customer',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:order:${order.id}`, 'order:preparing', {
      orderId: order.id,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Food preparation failed', { error: error.message, orderId });
    throw new AppError(`Food preparation failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Records order completion time.
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function logOrderCompletion(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await order.update({
      status: 'completed',
      actual_delivery_time: new Date(),
      updated_at: new Date(),
    });

    await TimeTracking.create({
      staff_id: staffId,
      clock_in: new Date(),
      duration: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_ORDER_UPDATE,
      details: { orderId: order.id, action: 'complete_order' },
      ipAddress,
    });

    const message = localization.formatMessage('order.completed', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDER,
      message,
      role: 'customer',
      module: 'munch',
      orderId,
    });

    socketService.emit(`munch:order:${order.id}`, 'order:completed', {
      orderId: order.id,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Order completion logging failed', { error: error.message, orderId });
    throw new AppError(`Completion logging failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Awards points for order processing.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardOrderPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TIMELY_PREP.action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TIMELY_PREP.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TIMELY_PREP.points,
    });
  } catch (error) {
    logger.error('Order points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

module.exports = {
  confirmTakeawayOrder,
  prepareDeliveryFood,
  logOrderCompletion,
  awardOrderPoints,
};