// accessControlController.js
// Handles access control-related requests for staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const accessControlService = require('@services/staff/security/accessControlService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff } = require('@models');

async function enforcePermissions(req, res, next) {
  try {
    const { staffId, requiredPermission } = req.body;
    const io = req.app.get('io');

    const accessGranted = await accessControlService.enforcePermissions(staffId, requiredPermission);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, permission: requiredPermission, action: 'enforce_permissions' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.securityFeatures.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.securityFeatures.points,
      details: { permission: requiredPermission },
    });

    socketService.emit(io, `staff:security:access_granted`, {
      staffId,
      permission: requiredPermission,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('security.access_granted', { permission: requiredPermission }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: { accessGranted },
    });
  } catch (error) {
    next(error);
  }
}

async function auditAccess(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const auditData = await accessControlService.auditAccess(staffId);

    const log = await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: auditData,
      ipAddress: req.ip,
    });

    socketService.emit(io, `staff:security:access_audited`, {
      staffId,
      logId: log.id,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('security.access_audited', { staffId }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: log,
    });
  } catch (error) {
    next(error);
  }
}

async function updateAccessRules(req, res, next) {
  try {
    const { staffId, permissions } = req.body;
    const io = req.app.get('io');

    const result = await accessControlService.updateAccessRules(staffId, permissions);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, permissions, action: 'update_access_rules' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.securityFeatures.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.securityFeatures.points,
      details: { permissions },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'security.access_updated',
      messageParams: { staffId },
      role: 'staff',
      module: 'security',
      languageCode: (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:security:rules_updated`, {
      staffId,
      permissions,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('security.access_updated', { staffId }, (await Staff.findByPk(staffId)).preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE),
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  enforcePermissions,
  auditAccess,
  updateAccessRules,
};