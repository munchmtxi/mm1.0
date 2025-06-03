'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const analyticsSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
    'any.required': 'Customer ID is required',
  }),
});

const validateAnalytics = (req, res, next) => {
  logger.info('Validating analytics request', { requestId: req.id });

  const data = req.body.customer_id ? req.body : { customer_id: req.params.customerId };
  const { error } = analyticsSchema.validate(data, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
};

module.exports = {
  validateAnalytics,
};