'use strict';

const { body, param } = require('express-validator');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');

/**
 * Ride validation middleware
 */
module.exports = {
  createRide: [
    body('pickupLocation').isObject().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_location')),
    body('dropoffLocation').isObject().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_location')),
    body('rideType').isString().isIn(['standard', 'shared']).withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_ride_type')),
    body('scheduledTime').optional().isISO8601().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_scheduled_time')),
    body('friends').optional().isArray().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_friends')),
  ],
  updateRideStatus: [
    body('rideId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_ride_id')),
    body('status').isString().isIn(['COMPLETED', 'CANCELLED']).withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_status')),
  ],
  addFriendsToRide: [
    body('rideId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_ride_id')),
    body('friends').isArray().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_friends')),
  ],
  submitFeedback: [
    body('rideId').isInt().withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_ride_id')),
    body('rating').isInt({ min: 1, max: 5 }).withMessage((_, { req }) => 
      formatMessage('customer', 'ride', req.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_rating')),
    body('comment').optional().isString(),
  ],
};