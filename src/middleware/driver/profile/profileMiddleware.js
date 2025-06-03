'use strict';

/**
 * Driver Profile Middleware
 * Implements middleware for driver profile operations, including authentication, role-based access control,
 * and permission checks. Integrates with provided authentication middleware.
 *
 * Last Updated: May 15, 2025
 */

const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth/authMiddleware');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

/**
 * Ensures the user is a driver and has permission to access profile operations.
 */
const restrictToDriver = catchAsync(async (req, res, next) => {
  logger.info('restrictToDriver middleware called', {
    requestId: req.id,
    userId: req.user?.id,
  });

  if (!req.user || req.user.role !== 'driver') {
    throw new AppError(
      'Only drivers can access this resource',
      403,
      driverConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  next();
});

/**
 * Verifies that the driverId in the request matches the authenticated user.
 */
const verifyDriverOwnership = catchAsync(async (req, res, next) => {
  const { driverId } = req.params;
  const user = req.user;

  logger.info('verifyDriverOwnership middleware called', {
    requestId: req.id,
    userId: user.id,
    driverId,
  });

  const driver = await require('@models').Driver.findByPk(driverId);
  if (!driver || driver.user_id !== user.id) {
    throw new AppError(
      'Unauthorized access to driver profile',
      403,
      driverConstants.ERROR_CODES.PERMISSION_DENIED
    );
  }

  next();
});

module.exports = {
  authenticate,
  restrictToDriver,
  verifyDriverOwnership,
  restrictTo: restrictTo('driver'),
  checkPermissions,
};