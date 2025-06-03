'use strict';

/**
 * Customer Profile Middleware
 * Handles admin-specific middleware for customer profile operations, including permission checks
 * and user validation, aligned with admin and customer constants.
 */

const { checkPermissions, restrictTo } = require('@middleware/common/authMiddleware');
const { ADMIN_ROLES, ADMIN_PERMISSIONS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const { CUSTOMER_STATUSES } = require('@constants/customer/customerConstants');
const { User } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const checkCustomerPermission = checkPermissions(ADMIN_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN].manageUsers.write);

const restrictToAdminRoles = restrictTo(
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.REGIONAL_ADMIN,
  ADMIN_ROLES.SUPPORT_ADMIN
);

const verifyCustomerStatus = catchAsync(async (req, res, next) => {
  const userId = req.body.user_id || req.params.userId;
  if (!userId) {
    return next();
  }

  const user = await User.findByPk(userId);
  if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.CUSTOMER) {
    logger.warn('Invalid or non-customer user', { userId });
    throw new AppError('Invalid or non-customer user', 400, 'INVALID_USER');
  }

  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (customer && customer.status !== CUSTOMER_STATUSES.ACTIVE) {
    logger.warn('Customer is not active', { userId, status: customer.status });
    throw new AppError('Customer is not active', 400, 'CUSTOMER_NOT_ACTIVE');
  }

  next();
});

module.exports = {
  checkCustomerPermission,
  restrictToAdminRoles,
  verifyCustomerStatus,
};