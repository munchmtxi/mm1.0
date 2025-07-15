// supplyService.js
// Manages supply operations for mtables staff. Handles supply monitoring, restocking requests, and readiness logging.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { MenuItem, InventoryAlert, InventoryAdjustmentLog, Staff, SupplyStatus } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function monitorSupplies(restaurantId) {
  try {
    const items = await MenuItem.findAll({
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

    return lowStockItems;
  } catch (error) {
    logger.error('Error monitoring supplies', { error: error.message, restaurantId });
    throw error;
  }
}

async function requestRestock(restaurantId, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

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
          details: { current_quantity: item.quantity, minimum_stock_level: item.minimum_stock_level },
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return lowStockItems.length;
  } catch (error) {
    logger.error('Error requesting restock', { error: error.message, restaurantId });
    throw error;
  }
}

async function logSupplyReadiness(restaurantId, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const supplyStatus = await SupplyStatus.create({
      branch_id: restaurantId,
      status: mtablesConstants.SUPPLY_STATUSES[0], // 'ready'
      checked_by: staffId,
      checked_at: new Date(),
    });

    return supplyStatus;
  } catch (error) {
    logger.error('Error logging supply readiness', { error: error.message, restaurantId });
    throw error;
  }
}

module.exports = {
  monitorSupplies,
  requestRestock,
  logSupplyReadiness,
};