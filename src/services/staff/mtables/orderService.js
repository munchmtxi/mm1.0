// orderService.js
// Manages order operations for mtables staff. Handles extra orders, kitchen preparation, cancellations, notifications, and metrics logging.
// Last Updated: July 15, 2025

'use strict';

const { InDiningOrder, OrderItems, Booking, BranchMetrics, Staff, MenuItem, TableLayoutSection, Cart, CartItem } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function processExtraOrder(bookingId, items, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Table, as: 'table', include: [{ model: TableLayoutSection, as: 'section' }] }]
    });
    if (!booking || booking.status !== mtablesConstants.BOOKING_STATUSES.CHECKED_IN) {
      throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    const allowedRoles = ['server', 'host', 'front_of_house'];
    if (!staff.staff_types.some(type => allowedRoles.includes(type))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }
    const requiredPermissions = ['process_orders', 'extra_order'];
    const staffPermissions = staffConstants.STAFF_PERMISSIONS[staff.staff_types[0]] || [];
    if (!requiredPermissions.every(perm => staffPermissions.includes(perm))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (booking.table.section && booking.table.section.assigned_staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_ASSIGNED_TO_SECTION);
    }

    if (!merchantConstants.MERCHANT_TYPES.includes(booking.branch.merchant_type)) {
      throw new Error(merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const activeOrders = await InDiningOrder.count({
      where: { customer_id: booking.customer_id, status: { [Op.in]: customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES.filter(s => s !== 'cancelled' && s !== 'refunded') } }
    });
    if (activeOrders >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_ORDERS) {
      throw new Error(customerConstants.ERROR_CODES.MAX_ACTIVE_ORDERS);
    }

    const cart = await Cart.findOne({
      where: { customer_id: booking.customer_id },
      include: [{ model: CartItem, as: 'items' }]
    });
    const cartItems = cart ? cart.items : [];
    if (items.length + cartItems.length > mtablesConstants.CART_SETTINGS.MAX_ITEMS_PER_CART) {
      throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_active) {
        throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
      }
      if (item.quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || item.quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
        throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
      }
      const itemPrice = menuItem.price * item.quantity;
      totalAmount += itemPrice;
      orderItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization,
      });
    }

    for (const cartItem of cartItems) {
      const menuItem = await MenuItem.findByPk(cartItem.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_active) {
        continue;
      }
      if (cartItem.quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || cartItem.quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
        continue;
      }
      const itemPrice = menuItem.price * cartItem.quantity;
      totalAmount += itemPrice;
      orderItems.push({
        menu_item_id: cartItem.menu_item_id,
        quantity: cartItem.quantity,
        customization: cartItem.customization,
      });
    }

    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[booking.branch.country] || localizationConstants.DEFAULT_CURRENCY;

    const order = await InDiningOrder.create({
      customer_id: booking.customer_id,
      branch_id: booking.branch_id,
      table_id: booking.table_id,
      order_number: orderNumber,
      status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      preparation_status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      total_amount: totalAmount,
      currency,
      payment_status: mtablesConstants.PAYMENT_STATUSES[0], // 'pending'
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

    if (cart) {
      await CartItem.destroy({ where: { cart_id: cart.id } });
    }

    return order;
  } catch (error) {
    logger.error('Error processing extra order', { error: error.message, bookingId });
    throw error;
  }
}

async function prepareDineInOrder(orderId, items, staffId) {
  try {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: Booking, as: 'booking', include: [{ model: Table, as: 'table', include: [{ model: TableLayoutSection, as: 'section' }] }] }]
    });
    if (!order) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    const allowedRoles = ['chef', 'manager', 'back_of_house'];
    if (!staff.staff_types.some(type => allowedRoles.includes(type))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }
    const requiredPermissions = ['update_order_statuses', 'prep_order'];
    const staffPermissions = staffConstants.STAFF_PERMISSIONS[staff.staff_types[0]] || [];
    if (!requiredPermissions.every(perm => staffPermissions.includes(perm))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (order.booking.table.section && order.booking.table.section.assigned_staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_ASSIGNED_TO_SECTION);
    }

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: orderId, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
      if (item.quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || item.quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
        throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
      }
      await orderItem.update({ quantity: item.quantity, customization: item.customization });
    }

    await order.update({ preparation_status: mtablesConstants.ORDER_STATUSES[1], updated_at: new Date() }); // 'preparing'

    return order;
  } catch (error) {
    logger.error('Error preparing dine-in order', { error: error.message, orderId });
    throw error;
  }
}

async function cancelExtraOrder(orderId, staffId, reason) {
  try {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: Booking, as: 'booking', include: [{ model: Table, as: 'table', include: [{ model: TableLayoutSection, as: 'section' }] }] }]
    });
    if (!order) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    if (order.status === mtablesConstants.ORDER_STATUSES[3]) { // 'cancelled'
      throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_CANCELLATION_FAILED);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    const allowedRoles = ['manager', 'server', 'front_of_house'];
    if (!staff.staff_types.some(type => allowedRoles.includes(type))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }
    const requiredPermissions = ['process_orders', 'resolve_dispute'];
    const staffPermissions = staffConstants.STAFF_PERMISSIONS[staff.staff_types[0]] || [];
    if (!requiredPermissions.every(perm => staffPermissions.includes(perm))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (order.booking.table.section && order.booking.table.section.assigned_staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_ASSIGNED_TO_SECTION);
    }

    // Check cancellation window
    const orderAgeHours = (new Date() - order.created_at) / (1000 * 60 * 60);
    if (orderAgeHours > mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
      throw new Error(mtablesConstants.ERROR_TYPES.CANCELLATION_WINDOW_EXPIRED);
    }

    await order.update({
      status: mtablesConstants.ORDER_STATUSES[3], // 'cancelled'
      updated_at: new Date(),
      cancellation_reason: reason
    });

    // Log audit
    await sequelize.models.AuditLog.create({
      action: mtablesConstants.AUDIT_TYPES.BOOKING_CANCELLED,
      entity_id: orderId,
      entity_type: 'order',
      details: { reason, staff_id: staffId }
    });

    return { success: mtablesConstants.SUCCESS_MESSAGES.BOOKING_CANCELLED };
  } catch (error) {
    logger.error('Error cancelling extra order', { error: error.message, orderId });
    throw error;
  }
}

async function notifyOrderStatus(orderId, staffId, status) {
  try {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: Booking, as: 'booking', include: [{ model: Customer, as: 'customer' }] }]
    });
    if (!order) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    const allowedRoles = ['server', 'manager', 'front_of_house'];
    if (!staff.staff_types.some(type => allowedRoles.includes(type))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }
    const requiredPermissions = ['process_orders'];
    const staffPermissions = staffConstants.STAFF_PERMISSIONS[staff.staff_types[0]] || [];
    if (!requiredPermissions.every(perm => staffPermissions.includes(perm))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (!mtablesConstants.ORDER_STATUSES.includes(status)) {
      throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
    }

    // Update order status
    await order.update({ status, updated_at: new Date() });

    // Create notification
    const notificationType = mtablesConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATED;
    await sequelize.models.Notification.create({
      user_id: order.booking.customer.user_id,
      type: notificationType,
      message: `Order ${order.order_number} status updated to ${status}`,
      delivery_method: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0], // 'push'
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // 'medium'
      status: 'not_sent',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Log audit
    await sequelize.models.AuditLog.create({
      action: mtablesConstants.AUDIT_TYPES.ORDER_STATUS_UPDATED,
      entity_id: orderId,
      entity_type: 'order',
      details: { status, staff_id: staffId }
    });

    return { success: mtablesConstants.SUCCESS_MESSAGES.ORDER_STATUS_UPDATED };
  } catch (error) {
    logger.error('Error notifying order status', { error: error.message, orderId });
    throw error;
  }
}

async function logOrderMetrics(orderId) {
  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

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

    await sequelize.models.AuditLog.create({
      action: mtablesConstants.AUDIT_TYPES.PAYMENT_PROCESSED,
      entity_id: orderId,
      entity_type: 'order',
      details: { total_amount: order.total_amount, currency: order.currency }
    });

    return { success: mtablesConstants.SUCCESS_MESSAGES.ORDER_PROCESSED };
  } catch (error) {
    logger.error('Error logging order metrics', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  processExtraOrder,
  prepareDineInOrder,
  cancelExtraOrder,
  notifyOrderStatus,
  logOrderMetrics,
};