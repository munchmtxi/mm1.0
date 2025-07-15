// accessControlService.js
// Manages access control for staff. Enforces permissions, audits access, and updates rules.
// Last Updated: May 26, 2025

'use strict';

const { Staff, StaffPermissions, Permissions, BranchPermission } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function enforcePermissions(staffId, requiredPermission) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: StaffPermissions, as: 'permissions', include: [{ model: Permissions }] }],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const hasPermission = staff.permissions.some(p => p.Permissions.name === requiredPermission);
    if (!hasPermission || !staffConstants.STAFF_PERMISSIONS[staff.position]?.[requiredPermission]) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    return true;
  } catch (error) {
    logger.error('Permission enforcement failed', { error: error.message, staffId, requiredPermission });
    throw error;
  }
}

async function auditAccess(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    return { staffId, action: 'access_attempt' };
  } catch (error) {
    logger.error('Access audit failed', { error: error.message, staffId });
    throw error;
  }
}

async function updateAccessRules(staffId, permissions) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    for (const perm of permissions) {
      if (!staffConstants.STAFF_PERMISSIONS[staff.position]?.[perm]) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
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

    return { staffId, permissions };
  } catch (error) {
    logger.error('Access rules update failed', { error: error.message, staffId });
    throw error;
  }
}

module.exports = {
  enforcePermissions,
  auditAccess,
  updateAccessRules,
};