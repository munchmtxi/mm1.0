'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mtablesConstants = require('@constants/mtablesConstants');
const paymentConstants = require('@constants/paymentConstants');

const splitPaymentSchema = Joi.object({
  walletId: Joi.number().integer().positive().required().messages({
    'number.base': 'Wallet ID must be a number',
    'number.integer': 'Wallet ID must be an integer',
    'number.positive': 'Wallet ID must be positive',
    'any.required': 'Wallet ID is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required',
  }),
  paymentMethodId: Joi.number().integer().positive().required().messages({
    'number.base': 'Payment method ID must be a number',
    'number.integer': 'Payment method ID must be an integer',
    'number.positive': 'Payment method ID must be positive',
    'any.required': 'Payment method ID is required',
  }),
});

const processPaymentSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be positive',
    'any.required': 'ID is required',
  }),
  amount: Joi.number().positive().when('splitPayments', {
    is: Joi.exist(),
    then: Joi.forbidden(),
    otherwise: Joi.required(),
  }).messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required',
    'any.forbidden': 'Amount cannot be provided with split payments',
  }),
  walletId: Joi.number().integer().positive().required().messages({
    'number.base': 'Wallet ID must be a number',
    'number.integer': 'Wallet ID must be an integer',
    'number.positive': 'Wallet ID must be positive',
    'any.required': 'Wallet ID is required',
  }),
  paymentMethodId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Payment method ID must be a number',
    'number.integer': 'Payment method ID must be an integer',
    'number.positive': 'Payment method ID must be positive',
  }),
  splitPayments: Joi.array().items(splitPaymentSchema).optional().max(paymentConstants.WALLET_SETTINGS.MAX_SPLIT_PARTICIPANTS).messages({
    'array.max': 'Too many split payments',
  }),
  type: Joi.string().valid('booking', 'order').required().messages({
    'string.base': 'Type must be a string',
    'any.only': 'Type must be booking or order',
    'any.required': 'Type is required',
  }),
});

const issueRefundSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be positive',
    'any.required': 'ID is required',
  }),
  walletId: Joi.number().integer().positive().required().messages({
    'number.base': 'Wallet ID must be a number',
    'number.integer': 'Wallet ID must be an integer',
    'number.positive': 'Wallet ID must be positive',
    'any.required': 'Wallet ID is required',
  }),
  transactionId: Joi.number().integer().positive().required().messages({
    'number.base': 'Transaction ID must be a number',
    'number.integer': 'Transaction ID must be an integer',
    'number.positive': 'Transaction ID must be positive',
    'any.required': 'Transaction ID is required',
  }),
  type: Joi.string().valid('booking', 'order').required().messages({
    'string.base': 'Type must be a string',
    'any.only': 'Type must be booking or order',
    'any.required': 'Type is required',
  }),
});

const validateProcessPayment = (req, res, next) => {
  logger.info('Validating process payment request', { requestId: req.id });
  const { error } = processPaymentSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'PAYMENT_PROCESSING_FAILED') || 'PAYMENT_PROCESSING_FAILED'));
  }
  next();
};

const validateIssueRefund = (req, res, next) => {
  logger.info('Validating issue refund request', { requestId: req.id });
  const { error } = issueRefundSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'REFUND_PROCESSING_FAILED') || 'REFUND_PROCESSING_FAILED'));
  }
  next();
};

const sendPaymentRequestSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  amount: Joi.number().positive().min(mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.min': 'Amount too low',
    'any.required': 'Amount is required',
  }),
  billSplitType: Joi.string().valid(...mtablesConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES).required().messages({
    'string.base': 'Bill split type must be a string',
    'any.only': 'Invalid bill split type',
    'any.required': 'Bill split type is required',
  }),
});

const validateSendPaymentRequest = (req, res, next) => {
  logger.info('Validating send payment request', { requestId: req.id });
  const { error } = sendPaymentRequestSchema.validate({ bookingId: req.params.bookingId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.INVALID_BILL_SPLIT));
  }
  next();
};

module.exports = {
  validateSendPaymentRequest,
  validateProcessPayment,
  validateIssueRefund,
};