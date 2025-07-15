'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');
const merchantConstants = require('@constants/merchantConstants');

const validateManageCertifications = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidMerchantId')),
  body('certData.type')
    .isIn(Object.values(merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS))
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidCertType')),
  body('certData.issueDate')
    .isISO8601()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidCertData')),
  body('certData.expiryDate')
    .isISO8601()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidCertData')),
];

const validateVerifyStaffCompliance = [
  param('staffId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidStaffId')),
];

const validateVerifyDriverCompliance = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidDriverId')),
];

const validateAuditCompliance = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'compliance', 'en', 'compliance.errors.invalidMerchantId')),
];

module.exports = { validateManageCertifications, validateVerifyStaffCompliance, validateVerifyDriverCompliance, validateAuditCompliance };