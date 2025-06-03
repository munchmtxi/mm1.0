'use strict';

/**
 * orderService.js
 * Manages order operations for mtables (staff role). Handles FOH extra orders, kitchen preparation,
 * metrics logging, and point awarding. Integrates with models and services.
 * Last Updated: May 25, 2025
 */

const { InDiningOrder, OrderItems, Booking, BranchMetrics, GamificationPoints, Staff } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Processes extra dine-in order (FOH).
 * @param {number} bookingId - Booking ID.
 * @param {Array} items - Order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created order.
 */
async function processExtraOrder(bookingId, items, staffId, ipAddress) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    if (!booking || booking.status !== 'seated') {
      throw new AppError('Invalid or unseated booking', 400, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_active) {
        throw new AppError('Invalid menu item', 400, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
      }
      const itemPrice = menuItem.price * item.quantity;
      totalAmount += itemPrice;
      orderItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization,
      });
    }

    const order = await InDiningOrder.create({
      customer_id: booking.customer_id,
      branch_id: booking.branch_id,
      table_id: booking.table_id,
      order_number: orderNumber,
      status: 'pending',
      preparation_status: 'pending',
      total_amount: totalAmount,
      currency: 'MWK',
      payment_status: 'pending',
      staff_id: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    for (const item of orderItems) {
      await OrderItems.create({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization,
      });
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_CREATE,
      details: { orderId: order.id, orderNumber, totalAmount },
      ipAddress,
    });

    const message = localization.formatMessage('order.created', {
      orderNumber,
      tableNumber: booking.table.table_number,
    });
    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      orderId: order.id,
    });

    socketService.emit(`mtables:order:${booking.customer_id}`, 'order:created', {
      orderId: order.id,
      orderNumber,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Extra order processing failed', { error: error.message, bookingId });
    throw new AppError(`Order processing failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Prepares dine-in order (Kitchen).
 * @param {number} orderId - Order ID.
 * @param {Array} items - Order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function prepareDineInOrder(orderId, items, staffId, ipAddress) {
  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: orderId, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) {
        throw new AppError('Order item not found', 404, staffConstants.STAFF_NOT_FOUND);
      }
      await orderItem.update({ quantity: item.quantity, customization: item.customization });
    }

    await order.update({ preparation_status: 'in_progress', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { orderId, action: 'prepare' },
      ipAddress,
    });

    const message = localization.formatMessage('order.preparing', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      orderId,
    });

    socketService.emit(`mtables:order:${order.customer_id}`, 'order:status_updated', {
      orderId,
      status: order.preparation_status,
    });

    return order;
  } catch (error) {
    logger.error('Order preparation failed', { error: error.message, orderId });
    throw new AppError(`Order preparation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Logs order metrics for gamification.
 * @param {number} orderId - Order ID.
 * @returns {Promise<void>}
 */
async function logOrderMetrics(orderId) {
  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await BranchMetrics.update(
      {
        total_orders: sequelize.literal('total_orders + 1'),
        total_revenue: sequelize.literal(`total_revenue + ${order.total_amount}`),
      },
      {
        where: {
          branch_id: order.branch_id,
          metric_date: new Date().toISOString().split('T')[0],
        },
      }
    );
  } catch (error) {
    logger.error('Order metrics logging failed', { error: error.message, orderId });
    throw new AppError(`Metrics logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
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
      throw new AppError('Staff not found', 404, staffConstants.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      languageCode: 'en',
    });

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Order points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  processExtraOrder,
  prepareDineInOrder,
  logOrderMetrics,
  awardOrderPoints,
};