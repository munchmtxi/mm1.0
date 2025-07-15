'use strict';

const { param, body } = require('express-validator');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const { formatMessage } = require('@utils/localization');

const validateTrackSales = [
  param('restaurantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidInput')),
  body('period')
    .isString()
    .isIn(mtablesConstants.ANALYTICS_PERIODS)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidPeriod')),
];

const validateAnalyzeBookingTrends = [
  param('restaurantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidInput')),
  body('period')
    .isString()
    .isIn(mtablesConstants.ANALYTICS_PERIODS)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidPeriod')),
];

const validateGenerateBookingReports = [
  param('restaurantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidInput')),
];

const validateAnalyzeCustomerEngagement = [
  param('restaurantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidInput')),
];

module.exports = {
  validateTrackSales,
  validateAnalyzeBookingTrends,
  validateGenerateBookingReports,
  validateAnalyzeCustomerEngagement,
};