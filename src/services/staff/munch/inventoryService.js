'use strict';

/**
 * inventoryService.js
 * Manages inventory operations for munch (staff role). Tracks supplies, handles restocking,
 * updates inventory, and awards points.
 * Last Updated: May 25, 2025
 */

const { MenuInventory, InventoryAdjustmentLog, InventoryAlert, OrderItems, GamificationPoints, Staff, InventoryBulkUpdate, ProductCategory } = require('@models');
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
 * Monitors ingredient/supply levels (BOH).
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Array>} Low stock items.
 */
async function trackInventory(restaurantId) {
  try {
    const items = await MenuInventory.findAll({
      where: {
        branch_id: restaurantId,
        quantity: { [Op.lte]: sequelize.col('minimum_stock_level') },
        is_published: true,
      },
      include: [{ model: InventoryAlert, as: 'alerts', where: { resolved: false }, required: false }],
    });

    const lowStockItems = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      minimum_stock_level: item.minimum_stock_level,
      alert: item.alerts?.length > 0,
    }));

    socketService.emit(`munch:inventory:${restaurantId}`, 'inventory:tracked', {
      restaurantId,
      lowStockItems: lowStockItems.length,
    });

    return lowStockItems;
  } catch (error) {
    logger.error('Inventory tracking failed', { error: error.message, restaurantId });
    throw new AppError(`Inventory tracking failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Handles restocking notifications.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function processRestockAlert(restaurantId, staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageInventory?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const lowStockItems = await MenuInventory.findAll({
      where: {
        branch_id: restaurantId,
        quantity: { [Op.lte]: sequelize.col('minimum_stock_level') },
      },
    });

    for (const item of lowStockItems) {
      const existingAlert = await InventoryAlert.findOne({
        where: { menu_item_id: item.id, resolved: false },
      });
      if (!existingAlert) {
        await InventoryAlert.create({
          menu_item_id: item.id,
          merchant_id: item.merchant_id,
          branch_id: restaurantId,
          type: 'low_stock',
          details: { current_quantity: item.quantity, minimum_stock_level: item.minimum_stock_level },
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { restaurantId, action: 'process_restock', itemCount: lowStockItems.length },
      ipAddress,
    });

    const message = localization.formatMessage('inventory.restock_alert', {
      itemCount: lowStockItems.length,
      branchId: restaurantId,
    });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'staff',
      module: 'munch',
      branchId: restaurantId,
    });

    socketService.emit(`munch:inventory:${restaurantId}`, 'inventory:restock_alert', {
      restaurantId,
      itemCount: lowStockItems.length,
    });
  } catch (error) {
    logger.error('Restock alert processing failed', { error: error.message, restaurantId });
    throw new AppError(`Restock alert failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Adjusts inventory post-order.
 * @param {number} orderId - Order ID.
 * @param {Array} items - Order items.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function updateInventory(orderId, items, staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageInventory?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem) {
        throw new AppError('Menu item not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
      }

      const newQuantity = menuItem.quantity - item.quantity;
      await menuItem.update({ quantity: newQuantity });

      await InventoryAdjustmentLog.create({
        menu_item_id: item.menu_item_id,
        merchant_id: menuItem.merchant_id,
        branch_id: menuItem.branch_id,
        adjustment_type: 'subtract',
        previous_quantity: menuItem.quantity,
        new_quantity: newQuantity,
        adjustment_amount: item.quantity,
        reason: 'Order fulfillment',
        performed_by: staffId,
        reference_id: orderId.toString(),
        reference_type: 'order',
        created_at: new Date(),
      });
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { orderId, action: 'update_inventory', itemCount: items.length },
      ipAddress,
    });

    socketService.emit(`munch:inventory:${order.branch_id}`, 'inventory:updated', {
      orderId,
      itemCount: items.length,
    });
  } catch (error) {
    logger.error('Inventory update failed', { error: error.message, orderId });
    throw new AppError(`Inventory update failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Awards points for inventory management.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardInventoryPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.INVENTORY_UPDATE.action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.INVENTORY_UPDATE.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.INVENTORY_UPDATE.points,
    });
  } catch (error) {
    logger.error('Inventory points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

module.exports = {
  trackInventory,
  processRestockAlert,
  updateInventory,
  awardInventoryPoints,
};