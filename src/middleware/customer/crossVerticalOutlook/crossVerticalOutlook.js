'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');

/**
 * Middleware to validate customer ID
 */
async function validateCustomerId(req, res, next) {
  const { customerId } = req.user;
  const { languageCode = 'en' } = req.query || req.body;

  try {
    if (!customerId || isNaN(customerId)) {
      throw new AppError(
        formatMessage('customer', 'crossVerticalOutlook', languageCode, 'errors.invalid_customer_id'),
        400,
        'INVALID_CUSTOMER_ID'
      );
    }
    next();
  } catch (error) {
    logger.logErrorEvent('Customer ID validation failed', { customerId, error: error.message });
    next(error);
  }
}

module.exports = {
  validateCustomerId,
};