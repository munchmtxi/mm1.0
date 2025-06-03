'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const meventsTrackingConstants = require('@constants/meventsTrackingConstants');

const trackUserInteractionsSchema = Joi.object({
  eventId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Event ID must be a number',
    'number.integer': 'Event ID must be an integer',
    'number.positive': 'Event ID must be positive',
  }),
  interactionType: Joi.string().valid(...Object.values(meventsTrackingConstants.INTERACTION_TYPES)).required().messages({
    'string.base': 'Interaction type must be a string',
    'any.only': 'Invalid interaction type',
    'any.required': 'Interaction type is required',
  }),
  metadata: Joi.object().optional().when('interactionType', {
    is: meventsTrackingConstants.INTERACTION_TYPES.IN_DINING_ORDER_ADDED,
    then: Joi.object({
      inDiningOrderId: Joi.number().integer().positive().required().messages({
        'number.base': 'In-dining order ID must be a number',
        'number.integer': 'In-dining order ID must be an integer',
        'number.positive': 'In-dining order ID must be positive',
        'any.required': 'In-dining order ID is required',
      }),
    }).required(),
  }).messages({
    'object.base': 'Metadata must be an object',
  }),
});

const validateTrackUserInteractions = (req, res, next) => {
  logger.info('Validating track user interactions request', { requestId: req.id });

  const { error } = trackUserInteractionsSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
};

module.exports = {
  validateTrackUserInteractions,
};