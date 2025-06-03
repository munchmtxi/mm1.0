'use strict';

/**
 * accessControlService.js
 * Manages access control for munch (staff role). Enforces permissions, audits access,
 * updates rules, and awards points.
 * Last Updated: May 26, 2025
 */

const { StaffPermissions, Roles, AuditLog, GamificationPoints, Staff, Permissions, BranchPermission } = require('@models');
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
 * Restricts access based on staff role and permissions.
 * @param {number} staffId - Staff ID.
 * @param {string} requiredPermission - Permission to check.
 * @returns {Promise<boolean>} True if access granted.
 */
async function enforcePermissions(staffId, requiredPermission) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: StaffPermissions, as: 'permissions', include: [{ model: Permissions }] }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const hasPermission = staff.permissions.some(p => p.Permissions.name === requiredPermission);
    if (!hasPermission || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.[requiredPermission]) {
      throw new AppError('Access denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await securityService.verifyMFA(staff.user_id);

    socketService.emit(`munch:security:${staffId}`, 'security:access_granted', { staffId, permission: requiredPermission });

    return true;
  } catch (error) {
    logger.error('Permission enforcement failed', { error: error.message, staffId, requiredPermission });
    throw new AppError(`Access enforcement failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Logs access attempts for compliance.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Audit log record.
 */
async function auditAccess(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const log = await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, action: 'access_attempt' },
      ipAddress,
    });

    socketService.emit(`munch:security:${staffId}`, 'security:access_audited', { staffId, logId: log.id });

    return log;
  } catch (error) {
    logger.error('Access audit failed', { error: error.message, staffId });
    throw new AppError(`Access audit failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Adjusts access rules for a staff member.
 * @param {number} staffId - Staff ID.
 * @param {Array<string>} permissions - Permissions to assign.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function updateAccessRules(staffId, permissions, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    for (const perm of permissions) {
      if (!staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.[perm]) {
        throw new AppError(`Invalid permission: ${perm}`, 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
      }

      let permission = await Permissions.findOne({ where: { name: perm } });
      if (!permission) {
        permission = await Permissions.create({ name: perm, action: perm, resource: 'staff' });
      }

      await StaffPermissions.findOrCreate({
        where: { staff_id: staffId, permission_id: permission.id },
        defaults: { is_active: true },
      });

      await BranchPermission.findOrCreate({
        where: { staff_role_id: staffId, branch_id: staff.branch_id, permission: perm },
        defaults: { granted_by: staffId, is_active: true },
      });
    }

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, permissions, action: 'update_access_rules' },
      ipAddress,
    });

    const message = localization.formatMessage('security.access_updated', { staffId });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:security:${staffId}`, 'security:rules_updated', { staffId, permissions });
  } catch (error) {
    logger.error('Access rules update failed', { error: error.message, staffId });
    throw new AppError(`Rules update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards points for secure access activities.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardAccessPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.SECURITY_FEATURES.action;
    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.SECURITY_FEATURES.points,
    });
  } catch (error) {
    logger.error('Access points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  enforcePermissions,
  auditAccess,
  updateAccessRules,
  awardAccessPoints,
};