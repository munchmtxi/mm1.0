'use strict';

/**
 * supplyService.js
 * Manages supply operations for mtables (staff role). Handles BOH supply monitoring, restocking requests,
 * readiness logging, and point awarding.
 * Last Updated: May 25, 2025
 */

const { MenuInventory, InventoryAlert, InventoryAdjustmentLog, GamificationPoints, Staff, SupplyStatus, InventoryBulkUpdate } = require('@models');
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
 * Tracks dining supplies (BOH).
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Array>} Low stock items.
 */
async function monitorSupplies(restaurantId) {
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

    socketService.emit(`mtables:supply:${restaurantId}`, 'supply:monitored', {
      restaurantId,
      lowStockItems: lowStockItems.length,
    });

    return lowStockItems;
  } catch (error) {
    logger.error('Supply monitoring failed', { error: error.message, restaurantId });
    throw new AppError(`Supply monitoring failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Sends restocking alerts.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function requestRestock(restaurantId, staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupplies?.includes('write')) {
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
      details: { restaurantId, action: 'request_restock', itemCount: lowStockItems.length },
      ipAddress,
    });

    const message = localization.formatMessage('supply.restock_requested', {
      itemCount: lowStockItems.length,
      branchId: restaurantId,
    });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'staff',
      module: 'mtables',
      branchId: restaurantId,
    });

    socketService.emit(`mtables:supply:${restaurantId}`, 'supply:restock_requested', {
      restaurantId,
      itemCount: lowStockItems.length,
    });
  } catch (error) {
    logger.error('Restock request failed', { error: error.message, restaurantId });
    throw new AppError(`Restock request failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Records supply readiness status.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function logSupplyReadiness(restaurantId, staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupplies?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const supplyStatus = await SupplyStatus.create({
      branch_id: restaurantId,
      status: 'ready',
      checked_by: staffId,
      checked_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { restaurantId, action: 'log_readiness', supplyStatusId: supplyStatus.id },
      ipAddress,
    });

    socketService.emit(`mtables:supply:${restaurantId}`, 'supply:readiness_logged', {
      restaurantId,
      status: supplyStatus.status,
    });
  } catch (error) {
    logger.error('Supply readiness logging failed', { error: error.message, restaurantId });
    throw new AppError(`Readiness logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Awards points for supply management.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardSupplyPoints(staffId) {
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

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.INVENTORY_UPDATE.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.INVENTORY_UPDATE.points,
    });
  } catch (error) {
    logger.error('Supply points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  monitorSupplies,
  requestRestock,
  logSupplyReadiness,
  awardSupplyPoints,
};