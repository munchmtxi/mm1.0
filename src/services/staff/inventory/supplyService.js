'use strict';

// Manages supply operations for mtables staff. Handles supply monitoring, restocking requests, readiness logging, and inventory adjustments.
// Last Updated: July 15, 2025

const { Op } = require('sequelize');
const { MenuInventory, MenuItem, InventoryAlert, InventoryAdjustmentLog, Staff, SupplyStatus } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const { getCurrentTimestamp } = require('@utils/dateTimeUtils');
const AppError = require('@utils/AppError');

async function monitorSupplies(restaurantId) {
  try {
    const items = await MenuItem.findAll({
      where: {
        branch_id: restaurantId,
        quantity: { [Op.lte]: sequelize.col('minimum_stock_level') },
        is_published: true,
      },
      include: [{ model: InventoryAlert, as: 'product', where: { resolved: false }, required: false }],
    });

    const lowStockItems = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      minimum_stock_level: item.minimum_stock_level,
      alert: item.product?.length > 0,
    }));

    logger.logApiEvent('Supplies monitored', {
      restaurantId,
      lowStockCount: lowStockItems.length,
      timestamp: getCurrentTimestamp(),
    });

    return lowStockItems;
  } catch (error) {
    throw handleServiceError('monitorSupplies', error, merchantConstants.ERROR_CODES[0]);
  }
}

async function requestRestock(restaurantId, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[1],
        404,
        staffConstants.STAFF_ERROR_CODES[1],
        { staffId }
      );
    }

    if (!staff.staff_types.includes(stockClerkConstants.STAFF_ROLE)) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[2],
        403,
        'Permission denied: Staff must be a stock clerk',
        { staffId, requiredRole: stockClerkConstants.STAFF_ROLE }
      );
    }

    const lowStockItems = await MenuItem.findAll({
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
          details: {
            current_quantity: item.quantity,
            minimum_stock_level: item.minimum_stock_level,
            requested_by: staffId,
          },
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        });

        logger.logApiEvent('Restock alert created', {
          menuItemId: item.id,
          restaurantId,
          staffId,
          timestamp: getCurrentTimestamp(),
        });
      }
    }

    logger.logApiEvent('Restock requested', {
      restaurantId,
      staffId,
      itemCount: lowStockItems.length,
      timestamp: getCurrentTimestamp(),
    });

    return lowStockItems.length;
  } catch (error) {
    throw handleServiceError('requestRestock', error, merchantConstants.ERROR_CODES[0]);
  }
}

async function logSupplyReadiness(restaurantId, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[1],
        404,
        staffConstants.STAFF_ERROR_CODES[1],
        { staffId }
      );
    }

    if (!staff.staff_types.includes(stockClerkConstants.STAFF_ROLE)) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[2],
        403,
        'Permission denied: Staff must be a stock clerk',
        { staffId, requiredRole: stockClerkConstants.STAFF_ROLE }
      );
    }

    const supplyStatus = await SupplyStatus.create({
      branch_id: restaurantId,
      status: 'ready',
      checked_by: staffId,
      checked_at: getCurrentTimestamp(),
      details: { logged_by: staffId },
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    });

    logger.logApiEvent('Supply readiness logged', {
      restaurantId,
      staffId,
      statusId: supplyStatus.id,
      timestamp: getCurrentTimestamp(),
    });

    return supplyStatus;
  } catch (error) {
    throw handleServiceError('logSupplyReadiness', error, merchantConstants.ERROR_CODES[0]);
  }
}

async function resolveInventoryAlert(alertId, staffId, resolutionDetails = {}) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[1],
        404,
        staffConstants.STAFF_ERROR_CODES[1],
        { staffId }
      );
    }

    if (!staff.staff_types.includes(stockClerkConstants.STAFF_ROLE)) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[2],
        403,
        'Permission denied: Staff must be a stock clerk',
        { staffId, requiredRole: stockClerkConstants.STAFF_ROLE }
      );
    }

    const alert = await InventoryAlert.findByPk(alertId);
    if (!alert) {
      throw new AppError(
        stockClerkConstants.ERROR_CODES[0],
        404,
        'Inventory alert not found',
        { alertId }
      );
    }

    if (alert.resolved) {
      throw new AppError(
        stockClerkConstants.ERROR_CODES[0],
        400,
        'Inventory alert already resolved',
        { alertId }
      );
    }

    await alert.update({
      resolved: true,
      resolved_by: staffId,
      resolved_at: getCurrentTimestamp(),
      details: { ...alert.details, resolution: resolutionDetails },
      updated_at: getCurrentTimestamp(),
    });

    logger.logApiEvent('Inventory alert resolved', {
      alertId,
      staffId,
      restaurantId: alert.branch_id,
      timestamp: getCurrentTimestamp(),
    });

    return alert;
  } catch (error) {
    throw handleServiceError('resolveInventoryAlert', error, merchantConstants.ERROR_CODES[0]);
  }
}

async function logInventoryAdjustment({ menuItemId, restaurantId, staffId, adjustmentType, adjustmentAmount, reason }) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[1],
        404,
        staffConstants.STAFF_ERROR_CODES[1],
        { staffId }
      );
    }

    if (!staff.staff_types.includes(stockClerkConstants.STAFF_ROLE)) {
      throw new AppError(
        staffConstants.STAFF_ERROR_CODES[2],
        403,
        'Permission denied: Staff must be a stock clerk',
        { staffId, requiredRole: stockClerkConstants.STAFF_ROLE }
      );
    }

    const menuItem = await MenuItem.findByPk(menuItemId);
    if (!menuItem || menuItem.branch_id !== restaurantId) {
      throw new AppError(
        stockClerkConstants.ERROR_CODES[2],
        404,
        'Menu item not found or does not belong to the specified branch',
        { menuItemId, restaurantId }
      );
    }

    if (!['add', 'subtract', 'set'].includes(adjustmentType)) {
      throw new AppError(
        stockClerkConstants.ERROR_CODES[0],
        400,
        'Invalid adjustment type',
        { adjustmentType }
      );
    }

    const previousQuantity = menuItem.quantity;
    let newQuantity;

    switch (adjustmentType) {
      case 'add':
        newQuantity = previousQuantity + adjustmentAmount;
        break;
      case 'subtract':
        newQuantity = previousQuantity - adjustmentAmount;
        if (newQuantity < 0) {
          throw new AppError(
            stockClerkConstants.ERROR_CODES[0],
            400,
            'Adjustment would result in negative quantity',
            { menuItemId, adjustmentAmount }
          );
        }
        break;
      case 'set':
        newQuantity = adjustmentAmount;
        if (newQuantity < 0) {
          throw new AppError(
            stockClerkConstants.ERROR_CODES[0],
            400,
            'New quantity cannot be negative',
            { menuItemId, adjustmentAmount }
          );
        }
        break;
    }

    await menuItem.update({ quantity: newQuantity, updated_at: getCurrentTimestamp() });

    const adjustmentLog = await InventoryAdjustmentLog.create({
      menu_item_id: menuItemId,
      merchant_id: menuItem.merchant_id,
      branch_id: restaurantId,
      adjustment_type: adjustmentType,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      adjustment_amount: adjustmentAmount,
      reason,
      performed_by: staffId,
      reference_type: 'manual',
      created_at: getCurrentTimestamp(),
    });

    logger.logApiEvent('Inventory adjustment logged', {
      menuItemId,
      restaurantId,
      staffId,
      adjustmentType,
      adjustmentAmount,
      timestamp: getCurrentTimestamp(),
    });

    return adjustmentLog;
  } catch (error) {
    throw handleServiceError('logInventoryAdjustment', error, merchantConstants.ERROR_CODES[0]);
  }
}

async function getSupplyStatusHistory(restaurantId, limit = 10, offset = 0) {
  try {
    const statuses = await SupplyStatus.findAll({
      where: { branch_id: restaurantId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        { model: Staff, as: 'checker', attributes: ['id', 'user_id'] },
      ],
    });

    logger.logApiEvent('Supply status history retrieved', {
      restaurantId,
      count: statuses.length,
      timestamp: getCurrentTimestamp(),
    });

    return statuses;
  } catch (error) {
    throw handleServiceError('getSupplyStatusHistory', error, merchantConstants.ERROR_CODES[0]);
  }
}

module.exports = {
  monitorSupplies,
  requestRestock,
  logSupplyReadiness,
  resolveInventoryAlert,
  logInventoryAdjustment,
  getSupplyStatusHistory,
};