'use strict';

/**
 * preOrderService.js
 * Manages pre-order operations for mtables (staff role). Handles FOH pre-order processing, kitchen preparation,
 * status notifications, and point awarding. Integrates with models and services.
 * Last Updated: May 25, 2025
 */

const { InDiningOrder, OrderItems, Booking, Notification, GamificationPoints, Staff, Cart, CartItem, ProductDiscount, Promotion } = require('@models');
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
 * Processes pre-order details (FOH).
 * @param {number} bookingId - Booking ID.
 * @param {Array} items - Pre-order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created pre-order.
 */
async function processPreOrder(bookingId, items, staffId, ipAddress) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    if (!booking) {
      throw new AppError('Booking not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageOrders?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const orderNumber = `PRE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id, { include: ['discounts'] });
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_published) {
        throw new AppError('Invalid menu item', 400, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
      }
      let itemPrice = menuItem.calculateFinalPrice() * item.quantity;
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
      is_pre_order: true,
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

    await Cart.destroy({ where: { customer_id: booking.customer_id } });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_CREATE,
      details: { orderId: order.id, orderNumber, totalAmount, isPreOrder: true },
      ipAddress,
    });

    const message = localization.formatMessage('pre_order.created', {
      orderNumber,
      tableNumber: booking.table?.table_number || 'N/A',
    });
    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      orderId: order.id,
    });

    socketService.emit(`mtables:preorder:${booking.customer_id}`, 'preorder:created', {
      orderId: order.id,
      orderNumber,
      status: order.status,
    });

    return order;
  } catch (error) {
    logger.error('Pre-order processing failed', { error: error.message, bookingId });
    throw new AppError(`Pre-order processing failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Prepares pre-ordered food (Kitchen).
 * @param {number} bookingId - Booking ID.
 * @param {Array} items - Pre-order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated order.
 */
async function preparePreOrderedFood(bookingId, items, staffId, ipAddress) {
  try {
    const order = await InDiningOrder.findOne({
      where: { booking_id: bookingId, is_pre_order: true },
      include: ['orderItems'],
    });
    if (!order) {
      throw new AppError('Pre-order not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
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

    await order.update({ preparation_status: 'in_progress', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { orderId: order.id, action: 'prepare_pre_order' },
      ipAddress,
    });

    const message = localization.formatMessage('pre_order.preparing', { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      orderId: order.id,
    });

    socketService.emit(`mtables:preorder:${order.customer_id}`, 'preorder:status_updated', {
      orderId: order.id,
      status: order.preparation_status,
    });

    return order;
  } catch (error) {
    logger.error('Pre-order preparation failed', { error: error.message, bookingId });
    throw new AppError(`Pre-order preparation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Notifies customers of pre-order status.
 * @param {number} bookingId - Booking ID.
 * @param {string} status - Pre-order status.
 * @returns {Promise<void>}
 */
async function notifyPreOrderStatus(bookingId, status) {
  try {
    const order = await InDiningOrder.findOne({ where: { booking_id: bookingId, is_pre_order: true } });
    if (!order) {
      throw new AppError('Pre-order not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const message = localization.formatMessage(`pre_order.${status}`, { orderNumber: order.order_number });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      orderId: order.id,
    });

    socketService.emit(`mtables:preorder:${order.customer_id}`, 'preorder:status_updated', {
      orderId: order.id,
      status,
    });
  } catch (error) {
    logger.error('Pre-order status notification failed', { error: error.message, bookingId });
    throw new AppError(`Status notification failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Awards points for pre-order processing.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardPreOrderPoints(staffId) {
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

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TIMELY_PREP.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TIMER_PREP.points,
    });
  } catch (error) {
    logger.error('Pre-order points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  processPreOrder,
  preparePreOrderedFood,
  notifyPreOrderStatus,
  awardPreOrderPoints,
};