// supplyController.js
// Handles supply-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const supplyService = require('@services/staff/mtables/supplyService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Staff } = require('@models');

async function monitorSupplies(req, res, next) {
  try {
    const { restaurantId } = req.body;
    const io = req.app.get('io');

    const lowStockItems = await supplyService.monitorSupplies(restaurantId);

    socketService.emit(io, `staff:mtSupplies:monitored`, {
      restaurantId,
      lowStockItems: lowStockItems.length,
    }, `supplies:${restaurantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.supplies_monitored', { itemCount: lowStockItems.length }, 'en'),
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
}

async function requestRestock(req, res, next) {
  try {
    const { restaurantId, staffId } = req.body;
    const io = req.app.get('io');

    const itemCount = await supplyService.requestRestock(restaurantId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { restaurantId, action: 'request_restock', itemCount },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.restockRequested.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.restockRequested.points,
      details: { restaurantId, itemCount },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPLY_ALERT,
      messageKey: 'mtables.restock_requested',
      messageParams: { itemCount, branchId: restaurantId },
      role: 'staff',
      module: 'mtables',
      languageCode: (await Staff.findByPk(staffId)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtSupplies:restock_requested`, {
      restaurantId,
      itemCount,
    }, `supplies:${restaurantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.restock_requested', { itemCount, branchId: restaurantId }, (await Staff.findByPk(staffId)).preferred_language || 'en'),
      data: { itemCount },
    });
  } catch (error) {
    next(error);
  }
}

async function logSupplyReadiness(req, res, next) {
  try {
    const { restaurantId, staffId } = req.body;
    const io = req.app.get('io');

    const supplyStatus = await supplyService.logSupplyReadiness(restaurantId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { restaurantId, action: 'log_readiness', supplyStatusId: supplyStatus.id },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.readinessLogged.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.readinessLogged.points,
      details: { restaurantId, supplyStatusId: supplyStatus.id },
    });

    socketService.emit(io, `staff:mtSupplies:readiness_logged`, {
      restaurantId,
      status: supplyStatus.status,
    }, `supplies:${restaurantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.readiness_logged', { restaurantId }, (await Staff.findByPk(staffId)).preferred_language || 'en'),
      data: supplyStatus,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  monitorSupplies,
  requestRestock,
  logSupplyReadiness,
};