// src/services/merchant/staff/roleManagementService.js
'use strict';

const logger = require('@utils/logger');
const staffConstants = require('@constants/staff/staffConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const kitchenConstants = require('@constants/staff/chefConstants');
const managerConstants = require('@constants/staff/managerConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const driverConstants = require('@constants/staff/driverConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const merchantConstants = require('@constants/staff/merchantConstants');
const { Staff, BranchRole, BranchStaffRole, BranchPermission, Merchant, User, Shift } = require('@models');
const { PERMISSIONS: BRANCH_PERMISSIONS } = require('@models/branchRole');

const roleConstantsMap = {
  front_of_house: frontOfHouseConstants,
  back_of_house: backOfHouseConstants,
  chef: kitchenConstants,
  manager: managerConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
  cashier: cashierConstants,
  driver: driverConstants,
  stock_clerk: stockClerkConstants,
  car_park_operative: carParkOperativeConstants,
};

async function assignRole(staffId, roleData, io, auditService, socketService, notificationService, pointService) {
  try {
    const { role, branchId } = roleData;
    if (!staffId || !role || !branchId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    if (!staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(role)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid role');
    }

    // Validate merchant type compatibility
    const roleConstants = roleConstantsMap[role];
    if (!roleConstants.SUPPORTED_MERCHANT_TYPES.includes(staff.merchant.business_type)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'INVALID_MERCHANT_TYPE' : 'Role not supported for merchant type');
    }

    const branchRole = await BranchRole.findOne({ where: { name: role, branch_id: branchId } });
    if (!branchRole) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Branch role not found');

    // Check if staff has an active shift (except for drivers)
    const activeShift = await Shift.findOne({
      where: { staff_id: staffId, branch_id: branchId, status: 'active' },
    });
    if (!activeShift && role !== 'driver') {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Staff must have an active shift');
    }

    const existingRole = await BranchStaffRole.findOne({
      where: { staff_id: staffId, branch_id: branchId, is_active: true },
    });
    if (existingRole) {
      await existingRole.update({ is_active: false, valid_until: new Date() });
    }

    await BranchStaffRole.create({
      staff_id: staffId,
      role_id: branchRole.id,
      branch_id: branchId,
      assigned_by: staff.user_id,
      valid_from: new Date(),
    });

    // Update staff_types array
    await Staff.update(
      { staff_types: [...new Set([...(staff.staff_types || []), role])] },
      { where: { id: staffId } }
    );

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId, role, branchId },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:roleAssigned', { staffId, role, branchId }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('profile_updated') ? 'profile_updated' : 'general',
      messageKey: staffConstants.SUCCESS_MESSAGES.includes('staff_role_assigned') ? 'staff_role_assigned' : 'Role assigned',
      messageParams: { role: roleConstants.NAME },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return { status: staffConstants.SUCCESS_MESSAGES.includes('staff_role_assigned') ? 'staff_role_assigned' : 'Role assigned', role, branchId };
  } catch (error) {
    logger.error('Error assigning role', { error: error.message });
    throw error;
  }
}

async function updatePermissions(staffId, permissionsData, io, auditService, socketService, notificationService, pointService) {
  try {
    const { permissions, branchId } = permissionsData;
    if (!staffId || !Array.isArray(permissions) || !branchId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    const branchStaffRole = await BranchStaffRole.findOne({ where: { staff_id: staffId, branch_id: branchId, is_active: true } });
    if (!branchStaffRole) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Active staff role not found');

    // Validate permissions against role-specific constants and BranchRole permissions
    const staffRoles = staff.staff_types || [];
    const validPermissions = staffRoles.reduce((acc, role) => {
      const roleConstants = roleConstantsMap[role];
      return [...acc, ...(roleConstants?.PERMISSIONS || [])];
    }, [...Object.values(BRANCH_PERMISSIONS)]);
    if (!permissions.every(p => validPermissions.includes(p))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('PERMISSION_DENIED') ? 'PERMISSION_DENIED' : 'Invalid permissions');
    }

    await BranchPermission.destroy({ where: { staff_role_id: branchStaffRole.id } });

    await BranchPermission.bulkCreate(
      permissions.map(permission => ({
        staff_role_id: branchStaffRole.id,
        branch_id: branchId,
        permission,
        granted_by: staff.user_id,
      }))
    );

    // Update custom_permissions in BranchStaffRole
    await branchStaffRole.update({ custom_permissions: permissions });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'profile_update',
      details: { staffId, permissions, branchId },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:permissionsUpdated', { staffId, permissions, branchId }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('profile_updated') ? 'profile_updated' : 'general',
      messageKey: staffConstants.SUCCESS_MESSAGES.includes('staff_permissions_updated') ? 'staff_permissions_updated' : 'Permissions updated',
      messageParams: { permissions: permissions.join(', ') },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return { status: staffConstants.SUCCESS_MESSAGES.includes('staff_permissions_updated') ? 'staff_permissions_updated' : 'Permissions updated', permissions, branchId };
  } catch (error) {
    logger.error('Error updating permissions', { error: error.message });
    throw error;
  }
}

async function verifyRoleCompliance(staffId, branchId, io, auditService, socketService, notificationService, pointService) {
  try {
    if (!staffId || !branchId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    const branchStaffRole = await BranchStaffRole.findOne({ where: { staff_id: staffId, branch_id: branchId, is_active: true } });
    if (!branchStaffRole) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Active staff role not found');

    // Check shift compliance (except for drivers)
    const activeShift = await Shift.findOne({
      where: { staff_id: staffId, branch_id: branchId, status: 'active' },
    });
    if (!activeShift && !staff.staff_types.includes('driver')) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Staff must have an active shift');
    }

    // Aggregate required certifications from all staff_types
    const requiredCerts = staff.staff_types.reduce((acc, type) => {
      const roleConstants = roleConstantsMap[type];
      return [...acc, ...(roleConstants?.CERTIFICATIONS?.REQUIRED || staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [])];
    }, []);
    const currentCerts = staff.certifications || [];
    const missingCerts = [...new Set(requiredCerts)].filter(cert => !currentCerts.includes(cert));
    const isCompliant = missingCerts.length === 0;

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_compliance_verify') ? 'staff_compliance_verify' : 'compliance_verify',
      details: { staffId, branchId, isCompliant, missingCerts },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:complianceVerified', { staffId, branchId, isCompliant, missingCerts }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('compliance_alert') ? 'compliance_alert' : 'general',
      messageKey: isCompliant
        ? staffConstants.SUCCESS_MESSAGES.includes('staff_compliance_verified') ? 'staff_compliance_verified' : 'Compliance verified'
        : staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('compliance_alert') ? 'compliance_alert' : 'Compliance failed',
      messageParams: { missingCerts: missingCerts.join(', ') || 'None' },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'task_completion')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'task_completion', points);

    return { isCompliant, missingCerts, branchId };
  } catch (error) {
    logger.error('Error verifying role compliance', { error: error.message });
    throw error;
  }
}

module.exports = {
  assignRole,
  updatePermissions,
  verifyRoleCompliance,
};