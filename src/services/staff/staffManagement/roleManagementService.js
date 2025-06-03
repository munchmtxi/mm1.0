'use strict';

/**
 * roleManagementService.js
 * Manages staff roles for munch (staff role). Assigns roles, updates permissions,
 * retrieves role details, and awards role-specific points.
 * Last Updated: May 26, 2025
 */

const { Staff, BranchStaffRole, Role, StaffPermissions, Permission, BranchPermission } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Assigns FOH/BOH/Kitchen roles to staff.
 * @param {number} staffId - Staff ID.
 * @param {string} role - Role to assign (e.g., front_of_house).
 * @param {number} assignedBy - ID of user assigning the role.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Assigned role record.
 */
async function assignRole(staffId, role, assignedBy, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!staffRolesConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(role)) {
      throw new AppError('Invalid role', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const roleRecord = await Role.findOne({ where: { name: 'staff' } });
    if (!roleRecord) {
      throw new AppError('Role not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const branchStaffRole = await BranchStaffRole.create({
      staff_id: staffId,
      role_id: roleRecord.id,
      branch_id: staff.branch_id,
      assigned_by: assignedBy,
      is_active: true,
      valid_from: new Date(),
    });

    await staff.update({ position: role });

    await auditService.logAction({
      userId: assignedBy,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, role, action: 'assign_role' },
      ipAddress,
    });

    const message = localization.formatMessage('role.role_assigned', { role: staffRolesConstants.STAFF_ROLES[role].name });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:role:${staffId}`, 'role:assigned', { staffId, role });

    return branchStaffRole;
  } catch (error) {
    logger.error('Role assignment failed', { error: error.message, staffId, role });
    throw new AppError(`Role assignment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Modifies role access permissions.
 * @param {number} staffId - Staff ID.
 * @param {Array<string>} permissions - Permissions to update.
 * @param {number} grantedBy - ID of user granting permissions.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function updateRolePermissions(staffId, permissions, grantedBy, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const branchStaffRole = await BranchStaffRole.findOne({
      where: { staff_id: staffId, branch_id: staff.branch_id, is_active: true },
    });
    if (!branchStaffRole) {
      throw new AppError('Active role not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    for (const perm of permissions) {
      if (!Object.keys(staffRolesConstants.STAFF_PERMISSIONS[staff.position]).includes(perm)) {
        throw new AppError(`Invalid permission: ${perm}`, 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
      }

      const permission = await Permission.findOne({ where: { name: perm } });
      if (!permission) {
        await Permission.create({ name: perm, action: perm, resource: 'staff' });
      }

      await BranchPermission.create({
        staff_role_id: branchStaffRole.id,
        branch_id: staff.branch_id,
        permission: perm,
        granted_by: grantedBy,
        is_active: true,
      });
    }

    await auditService.logAction({
      userId: grantedBy,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, permissions, action: 'update_permissions' },
      ipAddress,
    });

    socketService.emit(`munch:role:${staffId}`, 'role:permissions_updated', { staffId, permissions });
  } catch (error) {
    logger.error('Role permissions update failed', { error: error.message, staffId });
    throw new AppError(`Permissions update failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Retrieves role assignments for staff.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Role details.
 */
async function getRoleDetails(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [
        {
          model: BranchStaffRole,
          as: 'staff',
          where: { is_active: true },
          include: [{ model: BranchPermission, as: 'staffRole' }],
        },
      ],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const roleDetails = {
      staffId,
      position: staff.position,
      permissions: staff.staff[0]?.staffRole.map(p => p.permission) || [],
    };

    socketService.emit(`munch:role:${staffId}`, 'role:details_retrieved', roleDetails);

    return roleDetails;
  } catch (error) {
    logger.error('Role details retrieval failed', { error: error.message, staffId });
    throw new AppError(`Role details retrieval failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards role-specific points.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardRolePoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action;
    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Role points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  assignRole,
  updateRolePermissions,
  getRoleDetails,
  awardRolePoints,
};