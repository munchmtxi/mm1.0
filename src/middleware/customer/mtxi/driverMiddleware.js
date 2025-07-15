'use strict';

const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');

/**
 * Driver middleware
 */
module.exports = {
  validateLanguageCode: (req, res, next) => {
    const languageCode = req.headers['accept-language'] || localizationConstants.DEFAULT_LANGUAGE;
    if (!localizationConstants.SUPPORTED_LANGUAGES.includes(languageCode)) {
      return next(new AppError(
        formatMessage('customer', 'ride', languageCode, 'error.invalid_language'),
        400,
        customerGamificationConstants.ERROR_CODES[0]
      ));
    }
    req.languageCode = languageCode;
    next();
  },
};