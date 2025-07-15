// orderService.js
// Manages order operations for mtables staff. Handles extra orders, kitchen preparation, and metrics logging.
// Last Updated: May 25, 2025

'use strict';

const { InDiningOrder, OrderItems, Booking, BranchMetrics, Staff, MenuItem } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function processExtraOrder(bookingId, items, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    if (!booking || booking.status !== mtablesConstants.BOOKING_STATUSES.CHECKED_IN) {
      throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_active) {
        throw new Error(mtablesConstants.ERROR_CODES.INVALID_INPUT);
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
      status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      preparation_status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      total_amount: totalAmount,
      currency: 'MWK',
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

    return order;
  } catch (error) {
    logger.error('Error processing extra order', { error: error.message, bookingId });
    throw error;
  }
}

async function prepareDineInOrder(orderId, items, staffId) {
  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: orderId, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      await orderItem.update({ quantity: item.quantity, customization: item.customization });
    }

    await order.update({ preparation_status: mtablesConstants.ORDER_STATUSES[1], updated_at: new Date() }); // 'preparing'

    return order;
  } catch (error) {
    logger.error('Error preparing dine-in order', { error: error.message, orderId });
    throw error;
  }
}

async function logOrderMetrics(orderId) {
  try {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

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
    logger.error('Error logging order metrics', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  processExtraOrder,
  prepareDineInOrder,
  logOrderMetrics,
};