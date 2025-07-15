'use strict';

const { body, param } = require('express-validator');
const paymentConstants = require('@constants/common/paymentConstants');

const processSalaryPaymentValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('amount')
    .isFloat({ min: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min, max: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').max })
    .withMessage(`Amount must be between ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min} and ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').max}`)
];

const processBonusPaymentValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('amount')
    .isFloat({ min: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min, max: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').max })
    .withMessage(`Amount must be between ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min} and ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').max}`)
];

const confirmWithdrawalValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('amount')
    .isFloat({ min: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').min, max: paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max })
    .withMessage(`Amount must be between ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').min} and ${paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max}`)
];

const logPaymentAuditValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const handlePaymentErrorsValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('errorDetails.description')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
];

module.exports = {
  processSalaryPaymentValidation,
  processBonusPaymentValidation,
  confirmWithdrawalValidation,
  logPaymentAuditValidation,
  handlePaymentErrorsValidation
};