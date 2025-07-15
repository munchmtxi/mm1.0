// roleManagementService.js
// Manages staff roles for staff. Assigns roles, updates permissions, and retrieves role details.
// Last Updated: May 26, 2025

'use strict';

const { Staff, BranchStaffRole, Role, BranchPermission, Permission } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const kitchenConstants = require('@constants/staff/kitchenConstants');
const managerConstants = require('@constants/staff/managerConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const driverConstants = require('@constants/staff/driverConstants');
const logger = require('@utils/logger');

const rolePermissionMap = {
  front_of_house: frontOfHouseConstants.PERMISSIONS,
  back_of_house: backOfHouseConstants.PERMISSIONS,
  kitchen: kitchenConstants.PERMISSIONS,
  manager: managerConstants.PERMISSIONS,
  butcher: butcherConstants.PERMISSIONS,
  barista: baristaConstants.PERMISSIONS,
  stock_clerk: stockClerkConstants.PERMISSIONS,
  cashier: cashierConstants.PERMISSIONS,
  driver: driverConstants.PERMISSIONS,
};

async function assignRole(staffId, role, assignedBy) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    if (!staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(role)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const roleRecord = await Role.findOne({ where: { name: 'staff' } });
    if (!roleRecord) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const branchStaffRole = await BranchStaffRole.create({
      staff_id: staffId,
      role_id: roleRecord.id,
      branch_id: staff.branch_id,
      assigned_by: assignedBy,
      is_active: true,
      valid_from: new Date(),
    });

    await staff.update({ position: role });

    return branchStaffRole;
  } catch (error) {
    logger.error('Role assignment failed', { error: error.message, staffId, role });
    throw error;
  }
}

async function updateRolePermissions(staffId, permissions, grantedBy) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const branchStaffRole = await BranchStaffRole.findOne({
      where: { staff_id: staffId, branch_id: staff.branch_id, is_active: true },
    });
    if (!branchStaffRole) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const allowedPermissions = rolePermissionMap[staff.position] || [];
    for (const perm of permissions) {
      if (!allowedPermissions.includes(perm)) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
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

    return { staffId, permissions };
  } catch (error) {
    logger.error('Role permissions update failed', { error: error.message, staffId });
    throw error;
  }
}

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
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    return {
      staffId,
      position: staff.position,
      permissions: staff.staff[0]?.staffRole.map(p => p.permission) || [],
    };
  } catch (error) {
    logger.error('Role details retrieval failed', { error: error.message, staffId });
    throw error;
  }
}

module.exports = {
  assignRole,
  updateRolePermissions,
  getRoleDetails,
};