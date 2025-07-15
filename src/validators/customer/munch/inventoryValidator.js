'use strict';

/**
 * Validator for customer inventory endpoints
 */

const { param, query } = require('express-validator');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

/**
 * Validates restaurantId parameter
 */
const validateRestaurantId = param('restaurantId')
  .isUUID()
  .withMessage((value, { req }) =>
    formatMessage(
      'customer',
      'menu',
      req.languageCode || localizationConstants.DEFAULT_LANGUAGE,
      'invalid_restaurant_id'
    )
  );

/**
 * Validates itemId parameter
 */
const validateItemId = param('itemId')
  .isUUID()
  .withMessage((value, { req }) =>
    formatMessage(
      'customer',
      'menu',
      req.languageCode || localizationConstants.DEFAULT_LANGUAGE,
      'invalid_item_id'
    )
  );

/**
 * Validates limit query parameter
 */
const validateLimit = query('limit')
  .optional()
  .isInt({ min: 1, max: restaurantConstants.MUNCH_SETTINGS.MAX_FEATURED_ITEMS })
  .withMessage((value, { req }) =>
    formatMessage(
      'customer',
      'menu',
      req.languageCode || localizationConstants.DEFAULT_LANGUAGE,
      'invalid_limit',
      { max: restaurantConstants.MUNCH_SETTINGS.MAX_FEATURED_ITEMS }
    )
  );

module.exports = {
  getMenuItems: [validateRestaurantId],
  checkItemAvailability: [validateItemId],
  getFeaturedItems: [validateRestaurantId, validateLimit]
};