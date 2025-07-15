'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateSegmentCustomers = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMerchantId')),
  body('criteria.orderFrequency')
    .isObject()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCriteria')),
  body('criteria.bookingFrequency')
    .isObject()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCriteria')),
  body('criteria.spending')
    .isObject()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCriteria')),
];

const validateAnalyzeBehavior = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMerchantId')),
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCustomerId')),
];

const validateTargetOffers = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMerchantId')),
  body('segmentId')
    .isIn(['highValue', 'frequent', 'occasional'])
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidSegment')),
];

module.exports = { validateSegmentCustomers, validateAnalyzeBehavior, validateTargetOffers };