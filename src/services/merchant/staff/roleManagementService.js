'use strict';

/**
 * roleManagementService.js
 * Manages staff role assignments, permissions, compliance, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const staffConstants = require('@constants/staff/staffSystemConstants');
const {
  Staff,
  StaffPermissions,
  BranchRole,
  BranchStaffRole,
  BranchPermission,
  Merchant,
  User,
  GamificationPoints,
  Notification,
  AuditLog,
} = require('@models');

/**
 * Assigns a role to a staff member.
 * @param {number} staffId - Staff ID.
 * @param {string} role - Role to assign (e.g., 'front_of_house', 'kitchen').
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Role assignment result.
 */
async function assignRole(staffId, role, io) {
  try {
    if (!staffId || !role) throw new Error('Staff ID and role required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    if (!staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(role)) {
      throw new Error('Invalid role');
    }

    const branch = await BranchRole.findOne({ where: { name: role, branch_id: staff.branch_id } });
    if (!branch) throw new Error('Branch role not found');

    await BranchStaffRole.create({
      staff_id: staffId,
      role_id: branch.id,
      branch_id: staff.branch_id,
      assigned_by: staff.user_id,
    });

    await Staff.update({ position: role }, { where: { id: staffId } });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, role },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:roleAssigned', { staffId, role }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'staff.role_assigned',
      messageParams: { role },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    return { status: 'Role assigned', role };
  } catch (error) {
    logger.error('Error assigning role', { error: error.message });
    throw error;
  }
}

/**
 * Updates permissions for a staff member.
 * @param {number} staffId - Staff ID.
 * @param {Array<string>} permissions - Permissions to assign.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Permissions update result.
 */
async function updatePermissions(staffId, permissions, io) {
  try {
    if (!staffId || !Array.isArray(permissions)) throw new Error('Staff ID and permissions array required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    const branchStaffRole = await BranchStaffRole.findOne({ where: { staff_id: staffId, is_active: true } });
    if (!branchStaffRole) throw new Error('Active staff role not found');

    const validPermissions = Object.values(BranchRole.PERMISSIONS);
    if (!permissions.every(p => validPermissions.includes(p))) {
      throw new Error('Invalid permissions');
    }

    await BranchPermission.destroy({ where: { staff_role_id: branchStaffRole.id } });

    await BranchPermission.bulkCreate(
      permissions.map(permission => ({
        staff_role_id: branchStaffRole.id,
        branch_id: staff.branch_id,
        permission,
        granted_by: staff.user_id,
      }))
    );

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, permissions },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:permissionsUpdated', { staffId, permissions }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: 'staff.permissions_updated',
      messageParams: { permissions: permissions.join(', ') },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    return { status: 'Permissions updated', permissions };
  } catch (error) {
    logger.error('Error updating permissions', { error: error.message });
    throw error;
  }
}

/**
 * Verifies role compliance for a staff member.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance result.
 */
async function verifyRoleCompliance(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staff.position] || [];
    const currentCerts = staff.certifications || [];

    const missingCerts = requiredCerts.filter(cert => !currentCerts.includes(cert));
    const isCompliant = missingCerts.length === 0;

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
      details: { staffId, isCompliant, missingCerts },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:complianceVerified', { staffId, isCompliant, missingCerts }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
      messageKey: isCompliant ? 'staff.compliance_verified' : 'staff.compliance_failed',
      messageParams: { missingCerts: missingCerts.join(', ') || 'None' },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    return { isCompliant, missingCerts };
  } catch (error) {
    logger.error('Error verifying role compliance', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for role-specific performance.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackRoleGamification(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error('Staff not found');

    const action = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.PERFORMANCE_IMPROVEMENT.action;

    const points = await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, points: points.points, action },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:gamificationPointsAwarded', { staffId, points: points.points }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      messageKey: 'staff.gamification_points_awarded',
      messageParams: { points: points.points },
      role: 'staff',
      module: 'roleManagement',
      languageCode: staff.merchant?.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking role gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  assignRole,
  updatePermissions,
  verifyRoleCompliance,
  trackRoleGamification,
};