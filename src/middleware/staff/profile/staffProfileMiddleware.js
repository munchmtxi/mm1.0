'use strict';

/**
 * Staff Profile Middleware
 * Provides middleware for staff profile routes, including authentication, role-based
 * access control, and request validation. Integrates with authentication middleware
 * and staffConstants for permissions.
 *
 * Last Updated: May 16, 2025
 */

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const { STAFF_TYPES } = require('@constants/staff/staffRolesConstants');
const { STAFF_ERROR_CODES } = require('@constants/staff/staffSystemConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Validates staff ID in request parameters.
 */
const validateStaffId = (req, res, next) => {
  const { staffId } = req.params;
  if (!staffId || isNaN(parseInt(staffId, 10))) {
    logger.warn('Invalid staffId provided', { staffId });
    return next(new AppError(
      'Invalid staff ID',
      400,
      STAFF_ERROR_CODES.STAFF_NOT_FOUND
    ));
  }
  next();
};

/**
 * Ensures the authenticated user has access to the staff profile.
 */
const restrictToOwnProfileOrManager = (req, res, next) => {
  const { user, params } = req;
  const { staffId } = params;

  if (user.role !== STAFF_TYPES.MANAGER && user.staffId !== parseInt(staffId, 10)) {
    logger.warn('Unauthorized access to staff profile', { userId: user.id, staffId });
    return next(new AppError(
      'Unauthorized access to profile',
      403,
      STAFF_ERROR_CODES.PERMISSION_DENIED
    ));
  }
  next();
};

module.exports = {
  authenticateStaff: authenticate,
  restrictToStaffOrManager: restrictTo(
    STAFF_TYPES.FOH,
    STAFF_TYPES.BOH,
    STAFF_TYPES.KITCHEN,
    STAFF_TYPES.MANAGER,
    STAFF_TYPES.BUTCHER,
    STAFF_TYPES.BARISTA,
    STAFF_TYPES.STOCK_CLERK,
    STAFF_TYPES.CASHIER
  ),
  checkProfileUpdatePermission: checkPermissions('manageStaff'),
  validateStaffId,
  restrictToOwnProfileOrManager,
};