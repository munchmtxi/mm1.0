'use strict';

/**
 * Merchant Profile Middleware
 * Handles admin-specific middleware for merchant profile operations, including permission checks
 * and user validation, aligned with admin and merchant constants.
 */

const { checkPermissions, restrictTo } = require('@middleware/common/authMiddleware');
const { ADMIN_ROLES, ADMIN_PERMISSIONS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const { MERCHANT_STATUSES } = require('@constants/merchant/merchantConstants');
const { User, Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const checkMerchantPermission = checkPermissions(ADMIN_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN].manageUsers.write);

const restrictToAdminRoles = restrictTo(
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.REGIONAL_ADMIN,
  ADMIN_ROLES.COMPLIANCE_ADMIN
);

const verifyMerchantStatus = catchAsync(async (req, res, next) => {
  const merchantId = req.params.merchantId || req.body.merchant_id;
  const userId = req.body.user_id;
  const branchId = req.params.branchId;

  if (userId) {
    const user = await User.findByPk(userId);
    if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.MERCHANT) {
      logger.warn('Invalid or non-merchant user', { userId });
      throw new AppError('Invalid or non-merchant user', 400, 'INVALID_USER');
    }
  }

  if (merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      logger.warn('Merchant not found', { merchantId });
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.status === MERCHANT_STATUSES.SUSPENDED) {
      logger.warn('Merchant is suspended', { merchantId, status: merchant.status });
      throw new AppError('Merchant is suspended', 400, 'MERCHANT_SUSPENDED');
    }
  }

  if (branchId) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      logger.warn('Branch not found', { branchId });
      throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
    }
  }

  next();
});

module.exports = {
  checkMerchantPermission,
  restrictToAdminRoles,
  verifyMerchantStatus,
};