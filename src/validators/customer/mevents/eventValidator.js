'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const meventsConstants = require('@constants/meventsConstants');

const createEventSchema = Joi.object({
  title: Joi.string().min(1).max(meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH).required().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 1 character',
    'string.max': `Title cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH} characters`,
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH).optional().messages({
    'string.base': 'Description must be a string',
    'string.max': `Description cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH} characters`,
  }),
  occasion: Joi.string().valid(...Object.values(meventsConstants.EVENT_OCCASIONS)).required().messages({
    'string.base': 'Occasion must be a string',
    'any.only': 'Invalid occasion',
    'any.required': 'Occasion is required',
  }),
  paymentType: Joi.string().valid(...Object.values(meventsConstants.PAYMENT_TYPES)).required().messages({
    'string.base': 'Payment type must be a string',
    'any.only': 'Invalid payment type',
    'any.required': 'Payment type is required',
  }),
  participantIds: Joi.array().items(Joi.number().integer().positive()).max(meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS).optional().messages({
    'array.base': 'Participant IDs must be an array',
    'number.base': 'Participant ID must be a number',
    'number.integer': 'Participant ID must be an integer',
    'number.positive': 'Participant ID must be positive',
    'array.max': `Cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS} participants`,
  }),
  selectedMenuItems: Joi.array().items(Joi.number().integer().positive()).optional().messages({
    'array.base': 'Menu item IDs must be an array',
    'number.base': 'Menu item ID must be a number',
    'number.integer': 'Menu item ID must be an integer',
    'number.positive': 'Menu item ID must be positive',
  }),
  selectedTables: Joi.array().items(Joi.number().integer().positive()).optional().messages({
    'array.base': 'Table IDs must be an array',
    'number.base': 'Table ID must be a number',
    'number.integer': 'Table ID must be an integer',
    'number.positive': 'Table ID must be positive',
  }),
});

const manageGroupBookingsSchema = Joi.object({
  eventId: Joi.number().integer().positive().required().messages({
    'number.base': 'Event ID must be a number',
    'number.integer': 'Event ID must be an integer',
    'number.positive': 'Event ID must be positive',
    'any.required': 'Event ID is required',
  }),
  services: Joi.object({
    bookings: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Bookings must be an array',
      'number.base': 'Booking ID must be a number',
      'number.integer': 'Booking ID must be an integer',
      'number.positive': 'Booking ID must be positive',
    }),
    orders: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Orders must be an array',
      'number.base': 'Order ID must be a number',
      'number.integer': 'Order ID must be an integer',
      'number.positive': 'Order ID must be positive',
    }),
    rides: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Rides must be an array',
      'number.base': 'Ride ID must be a number',
      'number.integer': 'Ride ID must be an integer',
      'number.positive': 'Ride ID must be positive',
    }),
    inDiningOrders: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'In-dining orders must be an array',
      'number.base': 'In-dining order ID must be a number',
      'number.integer': 'In-dining order ID must be an integer',
      'number.positive': 'In-dining order ID must be positive',
    }),
    parkingBookings: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Parking bookings must be an array',
      'number.base': 'Parking booking ID must be a number',
      'number.integer': 'Parking booking ID must be an integer',
      'number.positive': 'Parking booking ID must be positive',
    }),
  }).required().messages({
    'object.base': 'Services must be an object',
    'any.required': 'Services are required',
  }),
});

const facilitateGroupChatSchema = Joi.object({
  eventId: Joi.number().integer().positive().required().messages({
    'number.base': 'Event ID must be a number',
    'number.integer': 'Event ID must be an integer',
    'number.positive': 'Event ID must be positive',
    'any.required': 'Event ID is required',
  }),
  participantIds: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.base': 'Participant IDs must be an array',
    'number.base': 'Participant ID must be a number',
    'number.integer': 'Participant ID must be an integer',
    'number.positive': 'Participant ID must be positive',
    'array.min': 'At least one participant is required',
    'any.required': 'Participant IDs are required',
  }),
});

const amendEventSchema = Joi.object({
  eventId: Joi.number().integer().positive().required().messages({
    'number.base': 'Event ID must be a number',
    'number.integer': 'Event ID must be an integer',
    'number.positive': 'Event ID must be positive',
    'any.required': 'Event ID is required',
  }),
  title: Joi.string().min(1).max(meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH).optional().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 1 character',
    'string.max': `Title cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH} characters`,
  }),
  description: Joi.string().max(meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH).optional().allow('').messages({
    'string.base': 'Description must be a string',
    'string.max': `Description cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH} characters`,
  }),
  occasion: Joi.string().valid(...Object.values(meventsConstants.EVENT_OCCASIONS)).optional().messages({
    'string.base': 'Occasion must be a string',
    'any.only': 'Invalid occasion',
  }),
  paymentType: Joi.string().valid(...Object.values(meventsConstants.PAYMENT_TYPES)).optional().messages({
    'string.base': 'Payment type must be a string',
    'any.only': 'Invalid payment type',
  }),
  participantIds: Joi.array().items(Joi.number().integer().positive()).max(meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS).optional().messages({
    'array.base': 'Participant IDs must be an array',
    'number.base': 'Participant ID must be a number',
    'number.integer': 'Participant ID must be an integer',
    'number.positive': 'Participant ID must be positive',
    'array.max': `Cannot exceed ${meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS} participants`,
  }),
  selectedMenuItems: Joi.array().items(Joi.number().integer().positive()).optional().messages({
    'array.base': 'Menu item IDs must be an array',
    'number.base': 'Menu item ID must be a number',
    'number.integer': 'Menu item ID must be an integer',
    'number.positive': 'Menu item ID must be positive',
  }),
  selectedTables: Joi.array().items(Joi.number().integer().positive()).optional().messages({
    'array.base': 'Table IDs must be an array',
    'number.base': 'Table ID must be a number',
    'number.integer': 'Table ID must be an integer',
    'number.positive': 'Table ID must be positive',
  }),
  services: Joi.object({
    bookings: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Bookings must be an array',
      'number.base': 'Booking ID must be a number',
      'number.integer': 'Booking ID must be an integer',
      'number.positive': 'Booking ID must be positive',
    }),
    orders: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Orders must be an array',
      'number.base': 'Order ID must be a number',
      'number.integer': 'Order ID must be an integer',
      'number.positive': 'Order ID must be positive',
    }),
    rides: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Rides must be an array',
      'number.base': 'Ride ID must be a number',
      'number.integer': 'Ride ID must be an integer',
      'number.positive': 'Ride ID must be positive',
    }),
    inDiningOrders: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'In-dining orders must be an array',
      'number.base': 'In-dining order ID must be a number',
      'number.integer': 'In-dining order ID must be an integer',
      'number.positive': 'In-dining order ID must be positive',
    }),
    parkingBookings: Joi.array().items(Joi.number().integer().positive()).optional().messages({
      'array.base': 'Parking bookings must be an array',
      'number.base': 'Parking booking ID must be a number',
      'number.integer': 'Parking booking ID must be an integer',
      'number.positive': 'Parking booking ID must be positive',
    }),
  }).optional().messages({
    'object.base': 'Services must be an object',
  }),
});

const validateCreateEvent = (req, res, next) => {
  logger.info('Validating create event request', { requestId: req.id });

  const { error } = createEventSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
});

const validateManageGroupBookings = (req, res, next) => {
  logger.info('Validating manage group bookings request', { requestId: req.id });

  const { error } = manageGroupBookingsSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
});

const validateFacilitateGroupChat = (req, res, next) => {
  logger.info('Validating facilitate group chat request', { requestId: req.id });

  const { error } = facilitateGroupChatSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
});

const validateAmendEvent = (req, res, next) => {
  logger.info('Validating amend event request', { requestId: req.id });

  const { error } = amendEventSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.warn('Validation failed', { requestId: req.id, errors: errorMessages });
    return next(new AppError('Invalid request parameters', 400, 'INVALID_REQUEST', errorMessages));
  }

  next();
});

module.exports = {
  validateCreateEvent,
  validateManageGroupBookings,
  validateFacilitateGroupChat,
  validateAmendEvent,
};