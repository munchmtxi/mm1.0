// orderService.js
// Manages order operations for munch staff. Verifies takeaway orders, prepares food, and logs completion.
// Last Updated: May 25, 2025

'use strict';

const { Order, OrderItems, TimeTracking, Staff } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function confirmTakeawayOrder(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await order.update({
      status: munchConstants.ORDER_STATUSES[1], // 'confirmed'
      staff_id: staffId,
      updated_at: new Date(),
    });

    return order;
  } catch (error) {
    logger.error('Error confirming takeaway order', { error: error.message, orderId });
    throw error;
  }
}

async function prepareDeliveryFood(orderId, items, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['orderItems'] });
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { order_id: order.id, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

      await orderItem.update({
        quantity: item.quantity,
        customization: item.customization || null,
      });
    }

    await order.update({
      status: munchConstants.ORDER_STATUSES[2], // 'preparing'
      updated_at: new Date(),
    });

    return order;
  } catch (error) {
    logger.error('Error preparing delivery food', { error: error.message, orderId });
    throw error;
  }
}

async function logOrderCompletion(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await order.update({
      status: munchConstants.ORDER_STATUSES[5], // 'delivered' (assuming completion means delivery for consistency)
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

    return order;
  } catch (error) {
    logger.error('Error logging order completion', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  confirmTakeawayOrder,
  prepareDeliveryFood,
  logOrderCompletion,
};