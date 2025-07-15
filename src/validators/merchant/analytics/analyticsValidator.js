'use strict';

const { param } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateTrackCustomerBehavior = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidCustomerId')),
];

const validateAnalyzeSpendingTrends = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidCustomerId')),
];

const validateProvideRecommendations = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidCustomerId')),
];

module.exports = { validateTrackCustomerBehavior, validateAnalyzeSpendingTrends, validateProvideRecommendations };