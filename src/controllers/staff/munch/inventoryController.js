// inventoryController.js
// Handles inventory-related requests for munch staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const inventoryService = require('@services/staff/munch/inventoryService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff } = require('@models');

async function trackInventory(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const io = req.app.get('io');

    const lowStockItems = await inventoryService.trackInventory(restaurantId);

    socketService.emit(io, `staff:munch:inventory:tracked`, {
      restaurantId,
      lowStockItems: lowStockItems.length,
    }, `branch:${restaurantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.inventory_tracked', { itemCount: lowStockItems.length }, munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
}

async function processRestockAlert(req, res, next) {
  try {
    const { restaurantId, staffId } = req.body;
    const io = req.app.get('io');

    const itemCount = await inventoryService.processRestockAlert(restaurantId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.SEND_RESTOCKING_ALERTS,
      details: { restaurantId, action: 'process_restock', itemCount },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.restockAlertProcessed.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.restockAlertProcessed.points,
      details: { restaurantId, itemCount },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: munchConstants.NOTIFICATION_TYPES.RESTOCKING_ALERT,
      messageKey: 'munch.restock_alert',
      messageParams: { itemCount, branchId: restaurantId },
      role: 'staff',
      module: 'munch',
      languageCode: (await Staff.findByPk(staffId)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:inventory:restock_alert`, {
      restaurantId,
      itemCount,
    }, `branch:${restaurantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.restock_alert', { itemCount, branchId: restaurantId }, (await Staff.findByPk(staffId)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: { itemCount },
    });
  } catch (error) {
    next(error);
  }
}

async function updateInventory(req, res, next) {
  try {
    const { orderId, items, staffId } = req.body;
    const io = req.app.get('io');

    const itemCount = await inventoryService.updateInventory(orderId, items, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.UPDATE_INVENTORY,
      details: { orderId, action: 'update_inventory', itemCount },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.inventoryUpdated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.inventoryUpdated.points,
      details: { orderId, itemCount },
    });

    socketService.emit(io, `staff:munch:inventory:updated`, {
      orderId,
      itemCount,
    }, `branch:${(await Order.findByPk(orderId)).branch_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.inventory_updated', { orderId, itemCount }, (await Staff.findByPk(staffId)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: { itemCount },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackInventory,
  processRestockAlert,
  updateInventory,
};