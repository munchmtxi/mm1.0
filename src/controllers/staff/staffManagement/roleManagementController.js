// roleManagementController.js
// Handles role management-related requests for staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const roleManagementService = require('@services/staff/staffManagement/roleManagementService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff } = require('@models');

async function assignRole(req, res, next) {
  try {
    const { staffId, role } = req.body;
    const assignedBy = req.user.id; // From authentication middleware
    const io = req.app.get('io');

    const branchStaffRole = await roleManagementService.assignRole(staffId, role, assignedBy);

    await auditService.logAction({
      userId: assignedBy,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, role, action: 'assign_role' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: role,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { role },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'staffManagement.role_assigned',
      messageParams: { role },
      role: 'staff',
      module: 'staffManagement',
      languageCode: (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:staffManagement:role_assigned`, {
      staffId,
      role,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('staffManagement.role_assigned', { role }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: branchStaffRole,
    });
  } catch (error) {
    next(error);
  }
}

async function updateRolePermissions(req, res, next) {
  try {
    const { staffId, permissions } = req.body;
    const grantedBy = req.user.id; // From authentication middleware
    const io = req.app.get('io');

    const result = await roleManagementService.updateRolePermissions(staffId, permissions, grantedBy);

    await auditService.logAction({
      userId: grantedBy,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, permissions, action: 'update_permissions' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { permissions },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'staffManagement.permissions_updated',
      messageParams: { staffId },
      role: 'staff',
      module: 'staffManagement',
      languageCode: (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:staffManagement:permissions_updated`, {
      staffId,
      permissions,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('staffManagement.permissions_updated', { staffId }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getRoleDetails(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const roleDetails = await roleManagementService.getRoleDetails(staffId);

    await auditService.logAction({
      userId: req.user.id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, action: 'get_role_details' },
      ipAddress: req.ip,
    });

    socketService.emit(io, `staff:staffManagement:details_retrieved`, {
      staffId,
      roleDetails,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('staffManagement.details_retrieved', { staffId }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: roleDetails,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assignRole,
  updateRolePermissions,
  getRoleDetails,
};