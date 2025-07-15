'use strict';

const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');

/**
 * Sets up request context for in-dining orders
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
function setupInDiningOrderContext(req, res, next) {
  const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

  // Ensure user is present (set by main route index auth)
  if (!req.user || !req.user.id) {
    return next(new AppError(
      formatMessage('customer', 'mtables', languageCode, 'errors.unauthorized_access', {}),
      403,
      customerConstants.ERROR_TYPES[10] // INVALID_CUSTOMER_ID
    ));
  }

  // Attach IP address for audit logging
  req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  next();
}

module.exports = { setupInDiningOrderContext };