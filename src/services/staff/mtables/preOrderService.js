// preOrderService.js
// Manages pre-order operations for mtables staff. Handles pre-order processing, kitchen preparation, and status notifications.
// Last Updated: May 25, 2025

'use strict';

const { InDiningOrder, OrderItems, Booking, Staff, Cart, CartItem } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function processPreOrder(bookingId, items, staffId) {
  try {
    const booking = await Booking.findByPk(bookingId, { include: ['table'] });
    if (!booking) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const orderNumber = `PRE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_published) {
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
      booking_id: bookingId,
      order_number: orderNumber,
      status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      preparation_status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      total_amount: totalAmount,
      currency: 'MWK',
      payment_status: mtablesConstants.PAYMENT_STATUSES[0], // 'pending'
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

    return order;
  } catch (error) {
    logger.error('Error processing pre-order', { error: error.message, bookingId });
    throw error;
  }
}

async function preparePreOrderedFood(bookingId, items, staffId) {
  try {
    const order = await InDiningOrder.findOne({
      where: { booking_id: bookingId, is_pre_order: true },
      include: ['orderItems'],
    });
    if (!order) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: order.id, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      await orderItem.update({ quantity: item.quantity, customization: item.customization });
    }

    await order.update({ preparation_status: mtablesConstants.ORDER_STATUSES[1], updated_at: new Date() }); // 'preparing'

    return order;
  } catch (error) {
    logger.error('Error preparing pre-ordered food', { error: error.message, bookingId });
    throw error;
  }
}

async function notifyPreOrderStatus(bookingId, status) {
  try {
    const order = await InDiningOrder.findOne({ where: { booking_id: bookingId, is_pre_order: true } });
    if (!order) throw new Error(mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);

    return order;
  } catch (error) {
    logger.error('Error notifying pre-order status', { error: error.message, bookingId });
    throw error;
  }
}

module.exports = {
  processPreOrder,
  preparePreOrderedFood,
  notifyPreOrderStatus,
};