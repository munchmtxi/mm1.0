'use strict';

const { param } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateUnifyServices = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidMerchantId')),
];

const validateSyncLoyaltyPoints = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidCustomerId')),
];

const validateEnsureConsistentUI = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidMerchantId')),
];

module.exports = { validateUnifyServices, validateSyncLoyaltyPoints, validateEnsureConsistentUI };