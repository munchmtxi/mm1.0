'use strict';

/**
 * Merchant Profile Middleware
 * Provides middleware for merchant profile routes, including authentication, role-based
 * access control, and request validation. Integrates with authentication middleware
 * and merchantConstants for permissions.
 *
 * Last Updated: May 14, 2025
 */

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const merchantConstants = require('@constants/merchantConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Validates merchant ID in request parameters.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const validateMerchantId = (req, res, next) => {
  const { merchantId } = req.params;
  if (!merchantId || isNaN(parseInt(merchantId))) {
    logger.warn('Invalid merchantId provided', { merchantId });
    return next(new AppError(
      'Invalid merchant ID',
      400,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    ));
  }
  next();
};

/**
 * Validates branch ID in request parameters.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const validateBranchId = (req, res, next) => {
  const { branchId, restaurantId } = req.params;
  const id = branchId || restaurantId;
  if (!id || isNaN(parseInt(id))) {
    logger.warn('Invalid branchId or restaurantId provided', { branchId, restaurantId });
    return next(new AppError(
      'Invalid branch ID',
      400,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    ));
  }
  next();
};

/**
 * Validates media ID in request parameters.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const validateMediaId = (req, res, next) => {
  const { mediaId } = req.params;
  if (!mediaId || isNaN(parseInt(mediaId))) {
    logger.warn('Invalid mediaId provided', { mediaId });
    return next(new AppError(
      'Invalid media ID',
      400,
      merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND
    ));
  }
  next();
};

/**
 * Ensures the authenticated user has access to the merchant profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const restrictToOwnMerchant = (req, res, next) => {
  const { user, params } = req;
  const { merchantId } = params;

  if (user.merchantId !== parseInt(merchantId)) {
    logger.warn('Unauthorized access to merchant profile', { userId: user.id, merchantId });
    return next(new AppError(
      'Unauthorized access to merchant profile',
      403,
      merchantConstants.ERROR_CODES.PERMISSION_DENIED
    ));
  }
  next();
};

module.exports = {
  authenticateMerchant: authenticate,
  restrictToMerchantTypes: restrictTo(
    merchantConstants.MERCHANT_TYPES.RESTAURANT,
    merchantConstants.MERCHANT_TYPES.BUTCHER,
    merchantConstants.MERCHANT_TYPES.CAFE,
    merchantConstants.MERCHANT_TYPES.GROCERY
  ),
  checkProfileUpdatePermission: checkPermissions('manage_merchant'),
  validateMerchantId,
  validateBranchId,
  validateMediaId,
  restrictToOwnMerchant,
};