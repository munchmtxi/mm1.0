'use strict';

/**
 * Driver Profile Middleware
 * Handles admin-specific middleware for driver profile operations, including permission checks
 * and user validation, aligned with admin and driver constants.
 */

const { checkPermissions, restrictTo } = require('@middleware/common/authMiddleware');
const { ADMIN_ROLES, ADMIN_PERMISSIONS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const { DRIVER_STATUSES } = require('@constants/driver/driverConstants');
const { User, Driver } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const checkDriverPermission = checkPermissions(ADMIN_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN].manageUsers.write);

const restrictToAdminRoles = restrictTo(
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.REGIONAL_ADMIN,
  ADMIN_ROLES.COMPLIANCE_ADMIN
);

const verifyDriverStatus = catchAsync(async (req, res, next) => {
  const driverId = req.params.driverId || req.body.driver_id;
  const userId = req.body.user_id;

  if (userId) {
    const user = await User.findByPk(userId);
    if (!user || user.role !== USER_MANAGEMENT_CONSTANTS.USER_TYPES.DRIVER) {
      logger.warn('Invalid or non-driver user', { userId });
      throw new AppError('Invalid or non-driver user', 400, 'INVALID_USER');
    }
  }

  if (driverId) {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      logger.warn('Driver not found', { driverId });
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
    }

    if (driver.status === DRIVER_STATUSES.SUSPENDED) {
      logger.warn('Driver is suspended', { driverId, status: driver.status });
      throw new AppError('Driver is suspended', 400, 'DRIVER_SUSPENDED');
    }
  }

  next();
});

module.exports = {
  checkDriverPermission,
  restrictToAdminRoles,
  verifyDriverStatus,
};