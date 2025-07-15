// inventoryService.js
// Manages inventory operations for munch staff. Tracks supplies, handles restocking, and updates inventory.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { MenuInventory, InventoryAdjustmentLog, InventoryAlert, Staff, Order } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

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

    return items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      minimum_stock_level: item.minimum_stock_level,
      alert: item.alerts?.length > 0,
    }));
  } catch (error) {
    logger.error('Error tracking inventory', { error: error.message, restaurantId });
    throw error;
  }
}

async function processRestockAlert(restaurantId, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

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

    return lowStockItems.length;
  } catch (error) {
    logger.error('Error processing restock alert', { error: error.message, restaurantId });
    throw error;
  }
}

async function updateInventory(orderId, items, staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    for (const item of items) {
      const menuItem = await MenuInventory.findByPk(item.menu_item_id);
      if (!menuItem) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

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

    return items.length;
  } catch (error) {
    logger.error('Error updating inventory', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  trackInventory,
  processRestockAlert,
  updateInventory,
};