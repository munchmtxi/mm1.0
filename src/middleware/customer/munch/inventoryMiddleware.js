'use strict';

/**
 * Middleware for customer inventory endpoints
 */

const { MerchantBranch } = require('@models');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');

/**
 * Verifies restaurant existence
 */
async function verifyRestaurant(req, res, next) {
  const { restaurantId } = req.params;
  const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('customer', 'menu', languageCode, 'restaurant_not_found'),
        404,
        restaurantConstants.ERROR_CODES.RESTAURANT_NOT_FOUND
      );
    }
    req.branch = branch;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies language code
 */
function verifyLanguageCode(req, res, next) {
  const languageCode = req.headers['accept-language'] || localizationConstants.DEFAULT_LANGUAGE;
  if (!localizationConstants.SUPPORTED_LANGUAGES.includes(languageCode)) {
    return next(new AppError(
      formatMessage('customer', 'menu', languageCode, 'unsupported_language'),
      400,
      restaurantConstants.ERROR_CODES.INVALID_REQUEST
    ));
  }
  req.languageCode = languageCode;
  next();
}

module.exports = {
  verifyRestaurant,
  verifyLanguageCode
};