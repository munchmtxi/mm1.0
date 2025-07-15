// src/validators/customer/disputes/disputeValidator.js
'use strict';

/**
 * Validators for dispute-related requests.
 */

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const disputeConstants = require('@constants/common/disputeConstants');

const createDisputeSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required().messages({
    'number.base': 'Service ID must be a number',
    'number.integer': 'Service ID must be an integer',
    'number.positive': 'Service ID must be positive',
    'any.required': 'Service ID is required',
  }),
  issue: Joi.string().min(1).max(disputeConstants.DISPUTE_SETTINGS.MAX_ISSUE_LENGTH).required().messages({
    'string.base': 'Issue must be a string',
    'string.empty': 'Issue is required',
    'string.min': 'Issue must be at least 1 character',
    'string.max': `Issue cannot exceed ${disputeConstants.DISPUTE_SETTINGS.MAX_ISSUE_LENGTH} characters`,
    'any.required': 'Issue is required',
  }),
  issueType: Joi.string().valid(...disputeConstants.ISSUE_TYPES).required().messages({
    'string.base': 'Issue type must be a string',
    'any.only': 'Invalid issue type',
    'any.required': 'Issue type is required',
  }),
});

const trackDisputeSchema = Joi.object({
  disputeId: Joi.number().integer().positive().required().messages({
    'number.base': 'Dispute ID must be a number',
    'number.integer': 'Dispute ID must be an integer',
    'number.positive': 'Dispute ID must be positive',
    'any.required': 'Dispute ID is required',
  }),
});

const resolveDisputeSchema = Joi.object({
  disputeId: Joi.number().integer().positive().required().messages({
    'number.base': 'Dispute ID must be a number',
    'number.integer': 'Dispute ID must be an integer',
    'number.positive': 'Dispute ID must be positive',
    'any.required': 'Dispute ID is required',
  }),
  resolution: Joi.string().min(1).max(500).required().messages({
    'string.base': 'Resolution must be a string',
    'string.empty': 'Resolution is required',
    'string.min': 'Resolution must be at least 1 character',
    'string.max': 'Resolution cannot exceed 500 characters',
    'any.required': 'Resolution is required',
  }),
  resolutionType: Joi.string().valid(...disputeConstants.RESOLUTION_TYPES).required().messages({
    'string.base': 'Resolution type must be a string',
    'any.only': 'Invalid resolution type',
    'any.required': 'Resolution type is required',
  }),
});

const validateCreateDispute = (req, res, next) => {
  logger.info('Validating create dispute request', { requestId: req.id });

  const { error } = createDisputeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }
  next();
});

const validateTrackDispute = (req, res, next) => {
  logger.info('Validating track dispute request', { requestId: req.id });

  const data = { disputeId: req.params.disputeId };
  const { error } = trackDisputeSchema.validate(data, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }
  next();
});

const validateResolveDispute = (req, res, next) => {
  logger.info('Validating resolve dispute request', { requestId: req.id });

  const { error } = resolveDisputeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }
  next();
});

module.exports = {
  validateCreateDispute,
  validateTrackDispute,
  validateResolveDispute,
};