'use strict';

/**
 * orderService.js
 * Manages order processing, dietary preferences, status updates, and wallet payments for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const walletService = require('@services/common/walletService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { Order, OrderItems, Customer, MenuInventory, MerchantBranch, Notification, AuditLog, ProductAuditLog, ProductActivityLog } = require('@models');

/**
 * Handles dine-in/takeaway/delivery orders.
 * @param {number} orderId - Order ID.
 * @param {Array} items - Order items with quantities and customizations.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Processed order.
 */
async function processOrder(orderId, items, io) {
  try {
    if (!orderId || !items?.length) throw new Error('Order ID and items required');

    const order = await Order.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }] });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'pending') throw new Error('Order already processed');

    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem || menuItem.availability_status !== 'in-stock') throw new Error(`Item ${item.menu_item_id} unavailable`);

      const quantity = item.quantity || 1;
      if (menuItem.quantity < quantity) throw new Error(`Insufficient stock for ${menuItem.name}`);

      const itemPrice = menuItem.calculateFinalPrice() * quantity;
      totalAmount += itemPrice;

      orderItems.push({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity,
        customization: item.customization || null,
      });

      await menuItem.update({ quantity: menuItem.quantity - quantity });

      await ProductAuditLog.create({
        menu_item_id: item.menu_item_id,
        user_id: 'system',
        action: 'update',
        changes: { quantity: menuItem.quantity },
      });

      await ProductActivityLog.create({
        productId: item.menu_item_id,
        merchantBranchId: order.branch_id,
        actorId: 'system',
        actorType: 'system',
        actionType: 'stock_adjusted',
        previousState: { quantity: menuItem.quantity + quantity },
        newState: { quantity: menuItem.quantity },
      });
    }

    await OrderItems.bulkCreate(orderItems);
    await order.update({ total_amount: totalAmount, status: 'confirmed' });

    await auditService.logAction({
      userId: order.customer_id,
      role: 'customer',
      action: 'process_order',
      details: { orderId, totalAmount, items: orderItems.map(i => i.menu_item_id) },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'order:processed', { orderId, status: 'confirmed', totalAmount }, `order:${orderId}`);

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: 'order_confirmation',
      messageKey: 'order.confirmed',
      messageParams: { orderNumber: order.order_number, amount: totalAmount },
      role: 'customer',
      module: 'order',
      languageCode: order.customer?.preferred_language || 'en',
    });

    return order;
  } catch (error) {
    logger.error('Error processing order', { error: error.message });
    throw error;
  }
}

/**
 * Filters orders by dietary preferences.
 * @param {number} customerId - Customer ID.
 * @param {Array} items - Order items.
 * @returns {Promise<Array>} Filtered items.
 */
async function applyDietaryPreferences(customerId, items) {
  try {
    if (!customerId || !items?.length) throw new Error('Customer ID and items required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const preferences = customer.dietary_preferences || [];
    if (!preferences.length) return items;

    const filteredItems = [];
    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem) continue;

      const itemTags = menuItem.tags || [];
      const isCompliant = preferences.every(pref => itemTags.includes(pref) || pref === 'none');
      if (isCompliant) filteredItems.push(item);
    }

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'apply_dietary_preferences',
      details: { customerId, filteredItems: filteredItems.map(i => i.menu_item_id) },
      ipAddress: '127.0.0.1',
    });

    return filteredItems;
  } catch (error) {
    logger.error('Error applying dietary preferences', { error: error.message });
    throw error;
  }
}

/**
 * Updates order progress.
 * @param {number} orderId - Order ID.
 * @param {string} status - New status.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated order.
 */
async function updateOrderStatus(orderId, status, io) {
  try {
    if (!orderId || !status) throw new Error('Order ID and status required');

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const order = await Order.findByPk(orderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');

    await order.update({ status });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'update_order_status',
      details: { orderId, status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'order:statusUpdated', { orderId, status }, `order:${orderId}`);

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: 'order_status_update',
      messageKey: `order.status.${status}`,
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'order',
      languageCode: order.customer?.preferred_language || 'en',
    });

    if (status === 'completed') {
      await pointService.awardPoints({
        userId: order.customer_id,
        role: 'customer',
        action: 'order_completed',
        languageCode: order.customer?.preferred_language || 'en',
      });
    }

    return order;
  } catch (error) {
    logger.error('Error updating order status', { error: error.message });
    throw error;
  }
}

/**
 * Processes wallet payments for an order.
 * @param {number} orderId - Order ID.
 * @param {number} walletId - Wallet ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Payment result.
 */
async function payOrderWithWallet(orderId, walletId, io) {
  try {
    if (!orderId || !walletId) throw new Error('Order ID and wallet ID required');

    const order = await Order.findByPk(orderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');
    if (order.payment_status === 'paid') throw new Error('Order already paid');

    const paymentResult = await walletService.debitWallet({
      walletId,
      userId: order.customer_id,
      amount: order.total_amount,
      currency: customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
      transactionType: 'order_payment',
      description: `Payment for order ${order.order_number}`,
    });

    await order.update({ payment_status: 'paid' });

    await auditService.logAction({
      userId: order.customer_id,
      role: 'customer',
      action: 'pay_order_with_wallet',
      details: { orderId, walletId, amount: order.total_amount },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'order:paymentProcessed', { orderId, paymentStatus: 'paid' }, `order:${orderId}`);

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: 'payment_confirmation',
      messageKey: 'order.payment_confirmed',
      messageParams: { orderNumber: order.order_number, amount: order.total_amount },
      role: 'customer',
      module: 'order',
      languageCode: order.customer?.preferred_language || 'en',
    });

    return paymentResult;
  } catch (error) {
    logger.error('Error processing wallet payment', { error: error.message });
    throw error;
  }
}

module.exports = {
  processOrder,
  applyDietaryPreferences,
  updateOrderStatus,
  payOrderWithWallet,
};