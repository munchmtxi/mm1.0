'use strict';

const { Op, sequelize } = require('sequelize');
const { MenuInventory, Order, MerchantBranch, ProductAuditLog, ProductActivityLog, InventoryAlert, InventoryAdjustmentLog, Merchant, Customer, MenuVersion, Staff } = sequelize.models;
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

async function trackStockLevels(restaurantId) {
  const transaction = await sequelize.transaction();

  try {
    if (!restaurantId) {
      throw new AppError('Invalid input: restaurantId is required', 400, munchConstants.ERROR_CODES[0]);
    }

    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Merchant branch not found', 404, merchantConstants.ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : munchConstants.ERROR_CODES[0]);
    }

    // Validate merchant type
    if (!merchantConstants.MERCHANT_TYPES.includes(branch.merchant?.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : munchConstants.ERROR_CODES[0]);
    }

    const inventory = await MenuInventory.findAll({
      where: { branch_id: restaurantId, is_published: true },
      attributes: ['id', 'name', 'sku', 'quantity', 'minimum_stock_level', 'availability_status'],
      include: [
        { model: Merchant, as: 'merchant' },
        { model: ProductAuditLog, as: 'auditLogs' },
      ],
      transaction,
    });

    const stockLevels = inventory.map(item => ({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      minimumStockLevel: item.minimum_stock_level,
      status: item.quantity <= (item.minimum_stock_level || 0) ? 'low' : 'sufficient',
    }));

    // Check for existing MenuVersion
    const menuVersion = await MenuVersion.findOne({
      where: { branch_id: restaurantId, merchant_id: branch.merchant_id },
      order: [['version_number', 'DESC']],
      transaction,
    });

    if (menuVersion) {
      logger.info('Menu version found', { version: menuVersion.version_number });
    }

    await transaction.commit();
    logger.info('Stock levels tracked', { restaurantId, success: merchantConstants.SUCCESS_MESSAGES.includes('inventory_updated') ? 'inventory_updated' : 'operation_success' });
    return stockLevels;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error tracking stock levels', { error: error.message });
    throw error;
  }
}

async function updateInventory(orderId, items) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !items?.length) {
      throw new AppError('Invalid input: orderId and items are required', 400, munchConstants.ERROR_CODES[0]);
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: MerchantBranch, as: 'branch' },
        { model: Merchant, as: 'merchant' },
        { model: Customer, as: 'customer' },
        { model: Staff, as: 'staff', required: false },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError('Order not found', 404, merchantConstants.ERROR_CODES.includes('INVALID_ORDER_TYPE') ? 'INVALID_ORDER_TYPE' : munchConstants.ERROR_CODES[0]);
    }

    // Validate staff role if assigned
    if (order.staff_id) {
      const staff = await Staff.findByPk(order.staff_id, { transaction });
      if (staff && !staff.staff_types.some(type => staffConstants.STAFF_PERMISSIONS[type]?.includes('update_inventory'))) {
        throw new AppError('Staff lacks permission to update inventory', 403, staffConstants.ERROR_CODES.includes('PERMISSION_DENIED') ? 'PERMISSION_DENIED' : munchConstants.ERROR_CODES[0]);
      }
    }

    const updatedItems = [];
    for (const item of items) {
      const inventoryItem = await MenuInventory.findOne({
        where: { branch_id: order.branch_id, id: item.menu_item_id },
        include: [
          { model: Merchant, as: 'merchant' },
          { model: ProductAuditLog, as: 'auditLogs' },
        ],
        transaction,
      });
      if (!inventoryItem) {
        throw new AppError(`Inventory item not found for ID: ${item.menu_item_id}`, 404, munchConstants.ERROR_CODES[0]);
      }

      const newQuantity = inventoryItem.quantity - (item.quantity || 1);
      if (newQuantity < 0) {
        throw new AppError(`Insufficient stock for item: ${inventoryItem.name}`, 400, munchConstants.ERROR_CODES[0]);
      }

      await inventoryItem.update(
        {
          quantity: newQuantity,
          availability_status: newQuantity <= (inventoryItem.minimum_stock_level || 0) ? 'out-of-stock' : 'in-stock',
          updated_by: order.staff_id || 'system',
        },
        { transaction },
      );

      await ProductAuditLog.create(
        {
          menu_item_id: inventoryItem.id,
          user_id: order.staff_id || 'system',
          action: 'update',
          changes: { quantity: newQuantity, availability_status: inventoryItem.availability_status },
        },
        { transaction },
      );

      await ProductActivityLog.create(
        {
          productId: inventoryItem.id,
          merchantBranchId: order.branch_id,
          actorId: order.staff_id || 'system',
          actorType: order.staff_id ? 'staff' : 'system',
          actionType: 'stock_adjusted',
          previousState: { quantity: inventoryItem.quantity },
          newState: { quantity: newQuantity },
        },
        { transaction },
      );

      await InventoryAdjustmentLog.create(
        {
          menu_item_id: inventoryItem.id,
          merchant_id: order.merchant_id,
          branch_id: order.branch_id,
          adjustment_type: 'subtract',
          previous_quantity: inventoryItem.quantity,
          new_quantity: newQuantity,
          adjustment_amount: item.quantity || 1,
          reason: 'Order fulfillment',
          performed_by: order.staff_id || 'system',
          reference_id: orderId,
          reference_type: 'order',
        },
        { transaction },
      );

      updatedItems.push({ itemId: inventoryItem.id, name: inventoryItem.name, newQuantity });
    }

    // Log bulk update
    await InventoryBulkUpdate.create(
      {
        merchant_id: order.merchant_id,
        branch_id: order.branch_id,
        total_items: items.length,
        successful_items: updatedItems.length,
        failed_items: 0,
        performed_by: order.staff_id || 'system',
        summary: { updatedItems: updatedItems.map(item => ({ id: item.itemId, newQuantity: item.newQuantity })) },
      },
      { transaction },
    );

    await transaction.commit();
    logger.info('Inventory updated', { orderId, success: merchantConstants.SUCCESS_MESSAGES.includes('inventory_updated') ? 'inventory_updated' : 'operation_success' });
    return updatedItems;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating inventory', { error: error.message });
    throw error;
  }
}

async function sendRestockingAlerts(restaurantId) {
  const transaction = await sequelize.transaction();

  try {
    if (!restaurantId) {
      throw new AppError('Invalid input: restaurantId is required', 400, munchConstants.ERROR_CODES[0]);
    }

    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Merchant branch not found', 404, merchantConstants.ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : munchConstants.ERROR_CODES[0]);
    }

    // Validate merchant type for inventory management
    if (!merchantConstants.BUSINESS_SETTINGS.AI_ENABLED_FEATURES.includes('inventory_management')) {
      logger.warn('Inventory management not enabled for merchant type', { merchantType: branch.merchant?.business_type });
    }

    const lowStockItems = await MenuInventory.findAll({
      where: {
        branch_id: restaurantId,
        quantity: { [Op.lte]: sequelize.col('minimum_stock_level') },
      },
      include: [
        { model: Merchant, as: 'merchant' },
        { model: ProductAuditLog, as: 'auditLogs' },
      ],
      transaction,
    });

    if (!lowStockItems.length) {
      await transaction.commit();
      return { success: true, message: 'No restocking needed' };
    }

    // Create InventoryAlert for each low stock item
    for (const item of lowStockItems) {
      await InventoryAlert.create(
        {
          menu_item_id: item.id,
          merchant_id: branch.merchant_id,
          branch_id: restaurantId,
          type: 'low_stock',
          details: {
            name: item.name,
            quantity: item.quantity,
            minimum_stock_level: item.minimum_stock_level,
          },
          resolved: false,
        },
        { transaction },
      );

      // Log notification attempt (aligned with NOTIFICATION_CONSTANTS)
      logger.info('Restocking alert created', {
        notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('restocking_alert') ? 'restocking_alert' : 'inventory_alert',
        itemId: item.id,
      });
    }

    await transaction.commit();
    logger.info('Restocking alerts prepared', {
      restaurantId,
      lowStockItems: lowStockItems.length,
      success: merchantConstants.SUCCESS_MESSAGES.includes('inventory_updated') ? 'inventory_updated' : 'operation_success',
    });
    return { restaurantId, lowStockItems: lowStockItems.map(item => ({ id: item.id, name: item.name })) };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error sending restocking alerts', { error: error.message });
    throw error;
  }
}

module.exports = {
  trackStockLevels,
  updateInventory,
  sendRestockingAlerts,
};