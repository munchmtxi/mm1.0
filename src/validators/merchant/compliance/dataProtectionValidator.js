'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateEncryptData = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidMerchantId')),
  body('data.userId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidInput')),
  body('data.role')
    .isIn(['customer', 'staff', 'driver'])
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidRole')),
  body('data.sensitiveData')
    .isObject()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidInput')),
];

const validateEnforceGDPR = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidMerchantId')),
];

const validateManageDataAccess = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidMerchantId')),
  body('accessData.userId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidAccessData')),
  body('accessData.role')
    .isIn(['customer', 'staff', 'driver'])
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidRole')),
  body('accessData.resource')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidAccessData')),
  body('accessData.permissions')
    .isArray({ min: 1 })
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidPermissions')),
];

module.exports = { validateEncryptData, validateEnforceGDPR, validateManageDataAccess };