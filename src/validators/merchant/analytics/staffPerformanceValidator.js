'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateMonitorStaffMetrics = [
  param('staffId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidStaffId')),
];

const validateGeneratePerformanceReports = [
  param('staffId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidStaffId')),
];

const validateProvideFeedback = [
  param('staffId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidStaffId')),
  body('feedback.message')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidFeedback')),
];

module.exports = { validateMonitorStaffMetrics, validateGeneratePerformanceReports, validateProvideFeedback };