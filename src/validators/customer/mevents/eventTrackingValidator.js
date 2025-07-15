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
  interactionType: Joi.string()
    .valid(...Object.values(meventsTrackingConstants.INTERACTION_TYPES))
    .required()
    .messages({
      'string.base': 'Interaction type must be a string',
      'any.only': 'Invalid interaction type',
      'any.required': 'Interaction type is required',
    }),
  metadata: Joi.object()
    .optional()
    .when('interactionType', [
      {
        is: meventsTrackingConstants.INTERACTION_TYPES.IN_DINING_ORDER_ADDED,
        then: Joi.object({
          inDiningOrderId: Joi.number().integer().positive().required().messages({
            'number.base': 'In-dining order ID must be a number',
            'number.integer': 'In-dining order ID must be an integer',
            'number.positive': 'In-dining order ID must be positive',
            'any.required': 'In-dining order ID is required',
          }),
        }).required(),
      },
      {
        is: meventsTrackingConstants.INTERACTION_TYPES.PARKING_BOOKING_ADDED,
        then: Joi.object({
          parkingBookingId: Joi.number().integer().positive().required().messages({
            'number.base': 'Parking booking ID must be a number',
            'number.integer': 'Parking booking ID must be an integer',
            'number.positive': 'Parking booking ID must be positive',
            'any.required': 'Parking booking ID is required',
          }),
        }).required(),
      },
      {
        is: meventsTrackingConstants.INTERACTION_TYPES.MENU_ITEM_SELECTED,
        then: Joi.object({
          menuItemId: Joi.number().integer().positive().required().messages({
            'number.base': 'Menu item ID must be a number',
            'number.integer': 'Menu item ID must be an integer',
            'number.positive': 'Menu item ID must be positive',
            'any.required': 'Menu item ID is required',
          }),
        }).required(),
      },
      {
        is: meventsTrackingConstants.INTERACTION_TYPES.TABLE_SELECTED,
        then: Joi.object({
          tableId: Joi.number().integer().positive().required().messages({
            'number.base': 'Table ID must be a number',
            'number.integer': 'Table ID must be an integer',
            'number.positive': 'Table ID must be positive',
            'any.required': 'Table ID is required',
          }),
        }).required(),
      },
      {
        is: meventsTrackingConstants.INTERACTION_TYPES.EVENT_UPDATED,
        then: Joi.object({
          eventId: Joi.number().integer().positive().required().messages({
            'number.base': 'Event ID must be a number',
            'number.integer': 'Event ID must be an integer',
            'number.positive': 'Event ID must be positive',
            'any.required': 'Event ID is required',
          }),
        }).required(),
      },
    ])
    .messages({
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