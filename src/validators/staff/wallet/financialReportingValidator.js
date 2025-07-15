'use strict';

const { param } = require('express-validator');

const commonValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

module.exports = {
  generatePaymentReportValidation: commonValidation,
  summarizeWalletActivityValidation: commonValidation,
  exportFinancialDataValidation: commonValidation,
  trackTaxComplianceValidation: commonValidation,
  auditFinancialTransactionsValidation: commonValidation
};