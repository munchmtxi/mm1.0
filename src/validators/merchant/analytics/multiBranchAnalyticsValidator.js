'use strict';

const { param } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateAggregateBranchData = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidMerchantId')),
];

const validateCompareBranchPerformance = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidMerchantId')),
];

const validateGenerateMultiBranchReports = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidMerchantId')),
];

const validateAllocateResources = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.invalidMerchantId')),
];

module.exports = { validateAggregateBranchData, validateCompareBranchPerformance, validateGenerateMultiBranchReports, validateAllocateResources };