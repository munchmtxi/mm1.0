'use strict';

/**
 * inventoryService.js
 * Manages inventory tracking, updates, restocking alerts, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const staffConstants = require('@constants/staff/staffSystemConstants');
const { MenuInventory, Staff, Order, MerchantBranch, Notification, AuditLog, ProductAuditLog, ProductActivityLog } = require('@models');

/**
 * Monitors ingredient/supply levels for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Stock levels data.
 */
async function trackStockLevels(restaurantId, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const inventory = await MenuInventory.findAll({
      where: { branch_id: restaurantId, is_published: true },
      attributes: ['id', 'name', 'sku', 'quantity', 'minimum_stock_level', 'availability_status'],
    });

    const stockLevels = inventory.map(item => ({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      minimumStockLevel: item.minimum_stock_level,
      status: item.quantity <= (item.minimum_stock_level || 0) ? 'low' : 'sufficient',
    }));

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'track_stock_levels',
      details: { restaurantId, stockLevels },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'inventory:stockLevels', { restaurantId, stockLevels }, `merchant:${restaurantId}`);

    return stockLevels;
  } catch (error) {
    logger.error('Error tracking stock levels', { error: error.message });
    throw error;
  }
}

/**
 * Adjusts inventory post-order.
 * @param {number} orderId - Order ID.
 * @param {Array} items - Order items with quantities.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated inventory items.
 */
async function updateInventory(orderId, items, io) {
  try {
    if (!orderId || !items?.length) throw new Error('Order ID and items required');

    const order = await Order.findByPk(orderId, { include: [{ model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');

    const updatedItems = [];
    for (const item of items) {
      const inventoryItem = await MenuInventory.findOne({
        where: { branch_id: order.branch_id, id: item.menu_item_id },
      });
      if (!inventoryItem) throw new Error(`Inventory item ${item.menu_item_id} not found`);

      const newQuantity = inventoryItem.quantity - (item.quantity || 1);
      if (newQuantity < 0) throw new Error(`Insufficient stock for ${inventoryItem.name}`);

      await inventoryItem.update({
        quantity: newQuantity,
        availability_status: newQuantity <= (inventoryItem.minimum_stock_level || 0) ? 'out-of-stock' : 'in-stock',
      });

      await ProductAuditLog.create({
        menu_item_id: inventoryItem.id,
        user_id: 'system',
        action: 'update',
        changes: { quantity: newQuantity, availability_status: inventoryItem.availability_status },
      });

      await ProductActivityLog.create({
        productId: inventoryItem.id,
        merchantBranchId: order.branch_id,
        actorId: 'system',
        actorType: 'system',
        actionType: 'stock_adjusted',
        previousState: { quantity: inventoryItem.quantity },
        newState: { quantity: newQuantity },
      });

      updatedItems.push({ itemId: inventoryItem.id, name: inventoryItem.name, newQuantity });
    }

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'update_inventory',
      details: { orderId, updatedItems },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'inventory:updated', { orderId, updatedItems }, `merchant:${order.branch_id}`);

    return updatedItems;
  } catch (error) {
    logger.error('Error updating inventory', { error: error.message });
    throw error;
  }
}

/**
 * Notifies BOH staff of restocking needs.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification results.
 */
async function sendRestockingAlerts(restaurantId, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const lowStockItems = await MenuInventory.findAll({
      where: {
        branch_id: restaurantId,
        quantity: { [Op.lte]: sequelize.col('minimum_stock_level') },
      },
    });

    if (!lowStockItems.length) return { success: true, message: 'No restocking needed' };

    const bohStaff = await Staff.findAll({
      where: {
        branch_id: restaurantId,
        position: staffConstants.STAFF_TYPES.BOH,
        availability_status: 'available',
      },
    });

    if (!bohStaff.length) throw new Error('No available back-of-house staff');

    const notificationResults = [];
    for (const staff of bohStaff) {
      const result = await notificationService.sendNotification({
        userId: staff.user_id,
        notificationType: 'restocking_alert',
        messageKey: 'inventory.restock_alert',
        messageParams: { items: lowStockItems.map(item => item.name).join(', ') },
        deliveryMethod: 'WHATSAPP',
        role: 'staff',
        module: 'inventory',
        languageCode: staff.user?.preferred_language || 'en',
      });
      notificationResults.push(result);
    }

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'send_restocking_alerts',
      details: { restaurantId, lowStockItems: lowStockItems.map(item => item.name), staffIds: bohStaff.map(s => s.user_id) },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'inventory:restockingAlerts', {
      restaurantId,
      lowStockItems: lowStockItems.map(item => ({ id: item.id, name: item.name })),
    }, `merchant:${restaurantId}`);

    return notificationResults;
  } catch (error) {
    logger.error('Error sending restocking alerts', { error: error.message });
    throw error;
  }
}

/**
 * Awards inventory update points to staff.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points record.
 */
async function trackInventoryGamification(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: MerchantBranch, as: 'branch' }] });
    if (!staff || staff.position !== staffConstants.STAFF_TYPES.BOH) throw new Error('Invalid or non-BOH staff');

    const pointsRecord = await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      subRole: staff.position,
      action: 'inventory_update',
      languageCode: staff.user?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'track_inventory_gamification',
      details: { staffId, points: pointsRecord.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'gamification:pointsAwarded', {
      staffId,
      points: pointsRecord.points,
      action: 'inventory_update',
    }, `staff:${staff.user_id}`);

    return pointsRecord;
  } catch (error) {
    logger.error('Error tracking inventory gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  trackStockLevels,
  updateInventory,
  sendRestockingAlerts,
  trackInventoryGamification,
};