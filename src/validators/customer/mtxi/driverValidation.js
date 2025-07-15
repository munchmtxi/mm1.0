'use strict';

const { param, body } = require('express-validator');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');

/**
 * Driver validation middleware
 */
module.exports = {
  trackDriver: [
    param('rideId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_ride_id')),
  ],
  updateDriverLocation: [
    body('coordinates').isObject().withMessage((_, { req }) => 
      formatMessage('driver', 'location', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_coordinates')),
    body('countryCode').isString().withMessage((_, { req }) => 
      formatMessage('driver', 'location', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_country_code')),
  ],
};