// preOrderService.js
// Manages pre-order operations for mtables staff. Handles pre-order processing and kitchen preparation for booking orders.
// Last Updated: July 15, 2025

'use strict';

const { Booking, OrderItems, Staff, Cart, CartItem, Table, MenuInventory } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const customerConstants = require('@constants/customer/customerConstants');
const logger = require('@utils/logger');

async function processPreOrder(bookingId, items, staffId) {
  try {
    // Fetch booking with associated table and staff
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Table, as: 'table', include: [{ model: Staff, as: 'assignedStaff' }] },
        { model: Staff, as: 'staff' }
      ]
    });
    if (!booking) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate staff and permissions
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    if (!staffConstants.STAFF_PERMISSIONS[staff.role]?.includes('process_orders')) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    // Check if staff is assigned to the table or booking
    if (booking.table?.assigned_staff_id !== staffId && booking.staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    // Validate group size
    if (booking.guest_count > customerConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE) {
      throw new Error(mtablesConstants.ERROR_TYPES.INVALID_PARTY_SIZE);
    }

    // Validate items and calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.branch_id !== booking.branch_id || !menuItem.is_published) {
        throw new Error(mtablesConstants.ERROR_TYPES.INVALID_INPUT);
      }
      if (item.dietary_preferences && !customerConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(item.dietary_preferences)) {
        throw new Error(customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
      }
      const itemPrice = menuItem.price * item.quantity;
      totalAmount += itemPrice;
      orderItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization || {},
        dietary_preferences: item.dietary_preferences || null,
      });
    }

    // Store pre-order items and total in booking
    await booking.update({
      selected_items: {
        items: orderItems,
        total_amount: totalAmount,
        currency: customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES.includes('MWK') ? 'MWK' : 'USD',
        status: mtablesConstants.ORDER_STATUSES[0], // 'pending'
      },
      updated_at: new Date()
    });

    // Create order items
    for (const item of orderItems) {
      await OrderItems.create({
        booking_id: bookingId, // Use booking_id instead of order_id
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization,
        dietary_preferences: item.dietary_preferences,
      });
    }

    // Clear cart
    await Cart.destroy({ where: { customer_id: booking.customer_id } });

    return booking;
  } catch (error) {
    logger.error('Error processing pre-order', { error: error.message, bookingId, staffId });
    throw error;
  }
}

async function preparePreOrderedFood(bookingId, items, staffId) {
  try {
    // Fetch booking with items
    const booking = await Booking.findOne({
      where: { id: bookingId },
      include: [
        { model: Table, as: 'table', include: [{ model: Staff, as: 'assignedStaff' }] },
        { model: Staff, as: 'staff' }
      ]
    });
    if (!booking || !booking.selected_items) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate staff and permissions
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    if (!staffConstants.STAFF_PERMISSIONS[staff.role]?.includes('prepare_food')) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    // Check table or booking assignment
    if (booking.table?.assigned_staff_id !== staffId && booking.staff_id !== staffId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    // Update order items
    for (const item of items) {
      const orderItem = await OrderItems.findOne({
        where: { booking_id: bookingId, menu_item_id: item.menu_item_id },
      });
      if (!orderItem) throw new Error(mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
      await orderItem.update({
        quantity: item.quantity,
        customization: item.customization || orderItem.customization,
        dietary_preferences: item.dietary_preferences || orderItem.dietary_preferences,
      });
    }

    // Update preparation status in selected_items
    await booking.update({
      selected_items: {
        ...booking.selected_items,
        status: mtablesConstants.ORDER_STATUSES[1], // 'preparing'
      },
      updated_at: new Date(),
    });

    return booking;
  } catch (error) {
    logger.error('Error preparing pre-ordered food', { error: error.message, bookingId, staffId });
    throw error;
  }
}

module.exports = {
  processPreOrder,
  preparePreOrderedFood,
};