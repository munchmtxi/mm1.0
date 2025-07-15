'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateMonitorDriverMetrics = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidDriverId')),
];

const validateGenerateDriverReports = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidDriverId')),
];

const validateProvideDriverFeedback = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidDriverId')),
  body('feedback.message')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidFeedback')),
];

module.exports = { validateMonitorDriverMetrics, validateGenerateDriverReports, validateProvideDriverFeedback };