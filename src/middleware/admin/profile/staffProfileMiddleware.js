'use strict';

/**
 * Staff Profile Middleware
 * Handles admin-specific middleware for staff profile operations, including permission checks
 * and user validation, aligned with admin and staff constants.
 */

const { checkPermissions, restrictTo } = require('@middleware/common/authMiddleware');
const { ADMIN_ROLES, ADMIN_PERMISSIONS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const { STAFF_STATUSES } = require('@constants/staff/staffRolesConstants');
const { User, Staff, Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const checkStaffPermission = checkPermissions(ADMIN_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN].manageUsers.write);

const restrictToAdminRoles = restrictTo(
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.REGIONAL_ADMIN,
  ADMIN_ROLES.COMPLIANCE_ADMIN
);

const verifyStaffStatus = catchAsync(async (req, res, next) => {
  const staffId = req.params.staffId || req.body.staff_id;
  const userId = req.body.user_id;
  const merchantId = req.body.merchant_id;

  if (userId) {
    const user = await User.findByPk(userId);
    if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.STAFF) {
      logger.warn('Invalid or non-staff user', { userId });
      throw new AppError('Invalid or non-staff user', 400, 'INVALID_USER');
    }
  }

  if (merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      logger.warn('Merchant not found', { merchantId });
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }
  }

  if (staffId) {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      logger.warn('Staff not found', { staffId });
      throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
    }

    if (staff.status === STAFF_STATUSES.SUSPENDED) {
      logger.warn('Staff is suspended', { staffId, status: staff.status });
      throw new AppError('Staff is suspended', 400, 'STAFF_SUSPENDED');
    }
  }

  next();
});

module.exports = {
  checkStaffPermission,
  restrictToAdminRoles,
  verifyStaffStatus,
};