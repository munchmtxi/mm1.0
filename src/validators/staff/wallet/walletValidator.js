'use strict';

const { body, param } = require('express-validator');
const paymentConstants = require('@constants/common/paymentConstants');

const getWalletBalanceValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const viewTransactionHistoryValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const requestWithdrawalValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('amount')
    .isFloat({ min: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').min, max: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max })
    .withMessage(`Amount must be between ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').min} and ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max}`)
];

const syncWithMerchantValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('merchantId')
    .isInt({ min: 1 }).withMessage('Merchant ID must be a positive integer')
];

const updateWalletPreferencesValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('preferences')
    .isObject().withMessage('Preferences must be an object')
    .custom((preferences) => {
      const validMethods = paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS;
      for (const method of Object.keys(preferences)) {
        if (!validMethods.includes(method)) {
          throw new Error(`Invalid notification method: ${method}`);
        }
      }
      return true;
    })
];

module.exports = {
  getWalletBalanceValidation,
  viewTransactionHistoryValidation,
  requestWithdrawalValidation,
  syncWithMerchantValidation,
  updateWalletPreferencesValidation
};