'use strict';

/**
 * Validators for cancellation and refund requests.
 */
const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');

const cancellationSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required().messages({
    'number.base': 'Service ID must be a number',
    'number.integer': 'Service ID must be an integer',
    'number.positive': 'Service ID must be positive',
    'any.required': 'Service ID is required',
  }),
  serviceType: Joi.string().valid(...customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES).required().messages({
    'string.base': 'Service type must be a string',
    'any.only': 'Invalid service type',
    'any.required': 'Service type is required',
  }),
  reason: Joi.string().min(1).max(255).required().messages({
    'string.base': 'Reason must be a string',
    'string.empty': 'Reason is required',
    'string.min': 'Reason must be at least 1 character',
    'string.max': 'Reason cannot exceed 255 characters',
    'any.required': 'Reason is required',
  }),
});

const refundSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required().messages({
    'number.base': 'Service ID must be a number',
    'number.integer': 'Service ID must be an integer',
    'number.positive': 'Service ID must be positive',
    'any.required': 'Service ID is required',
  }),
  walletId: Joi.number().integer().positive().required().messages({
    'number.base': 'Wallet ID must be a number',
    'number.integer': 'Wallet ID must be an integer',
    'number.positive': 'Wallet ID must be positive',
    'any.required': 'Wallet ID is required',
  }),
  serviceType: Joi.string().valid(...customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES).required().messages({
    'string.base': 'Service type must be a string',
    'any.only': 'Invalid service type',
    'any.required': 'Service type is required',
  }),
});

/**
 * Validates cancellation request body.
 */
const validateCancellation = (req, res, next) => {
  logger.info('Validating cancellation request', { requestId: req.id });

  const { error } = cancellationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, customerConstants.ERROR_CODES.find(code => code === 'INVALID_REQUEST'), errorMessages));
  }

  next();
};

/**
 * Validates refund request body.
 */
const validateRefund = (req, res, next) => {
  logger.info('Validating refund request', { requestId: req.id });

  const { error } = refundSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, customerConstants.ERROR_CODES.find(code => code === 'INVALID_REQUEST'), errorMessages));
  }

  next();
};

module.exports = {
  validateCancellation,
  validateRefund,
};