'use strict';

/**
 * Branch Profile Middleware
 * Handles admin-specific middleware for branch profile operations, including permission checks
 * and input sanitization, aligned with admin and merchant constants.
 */

const { checkPermissions, restrictTo } = require('@middleware/common/authMiddleware');
const { ADMIN_ROLES, ADMIN_PERMISSIONS } = require('@constants/admin/adminCoreConstants');
const { MERCHANT_STATUSES } = require('@constants/merchant/merchantConstants');
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const checkBranchPermission = checkPermissions(ADMIN_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN].manageUsers.write);

const restrictToAdminRoles = restrictTo(
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.REGIONAL_ADMIN,
  ADMIN_ROLES.COMPLIANCE_ADMIN
);

const verifyMerchantStatus = catchAsync(async (req, res, next) => {
  const { merchant_id } = req.body;
  if (!merchant_id) {
    return next();
  }

  const merchant = await Merchant.findByPk(merchant_id);
  if (!merchant) {
    logger.warn('Merchant not found', { merchant_id });
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  if (merchant.status !== MERCHANT_STATUSES.ACTIVE) {
    logger.warn('Merchant is not active', { merchant_id, status: merchant.status });
    throw new AppError('Merchant is not active', 400, 'MERCHANT_NOT_ACTIVE');
  }

  next();
});

module.exports = {
  checkBranchPermission,
  restrictToAdminRoles,
  verifyMerchantStatus,
};