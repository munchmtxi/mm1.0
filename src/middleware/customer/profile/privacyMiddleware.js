'use strict';

/**
 * Middleware for customer privacy routes.
 */

const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');

module.exports = {
  validateUserId(req, res, next) {
    const { userId } = req;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_user_id'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_CUSTOMER')
      );
    }
    next();
  },

  validateLanguageCode(req, res, next) {
    const { languageCode } = req.body;
    if (languageCode && !customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES.includes(languageCode)) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_language'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_LANGUAGE')
      );
    }
    req.languageCode = languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE;
    next();
  },
};