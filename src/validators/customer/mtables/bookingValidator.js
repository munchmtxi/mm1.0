'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mtablesConstants = require('@constants/mtablesConstants');

const createReservationSchema = Joi.object({
  tableId: Joi.number().integer().positive().required().messages({
    'number.base': 'Table ID must be a number',
    'number.integer': 'Table ID must be an integer',
    'number.positive': 'Table ID must be positive',
    'any.required': 'Table ID is required',
  }),
  branchId: Joi.number().integer().positive().required().messages({
    'number.base': 'Branch ID must be a number',
    'number.integer': 'Branch ID must be an integer',
    'number.positive': 'Branch ID must be positive',
    'any.required': 'Branch ID is required',
  }),
  date: Joi.string().isoDate().required().messages({
    'string.base': 'Date must be a string',
    'string.isoDate': 'Invalid date format',
    'any.required': 'Date is required',
  }),
  time: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.base': 'Time must be a string',
    'string.pattern.base': 'Invalid time format (HH:MM)',
    'any.required': 'Time is required',
  }),
  partySize: Joi.number().integer().min(mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY).max(mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY).required().messages({
    'number.base': 'Party size must be a number',
    'number.integer': 'Party size must be an integer',
    'number.min': 'Party size too small',
    'number.max': 'Party size too large',
    'any.required': 'Party size is required',
  }),
  dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional().messages({
    'array.base': 'Dietary preferences must be an array',
    'any.only': 'Invalid dietary preference',
  }),
  specialRequests: Joi.string().max(400).optional().messages({
    'string.base': 'Special requests must be a string',
    'string.max': 'Special requests too long',
  }),
  seatingPreference: Joi.string().valid(...mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES).optional().messages({
    'string.base': 'Seating preference must be a string',
    'any.only': 'Invalid seating preference',
  }),
  paymentMethodId: Joi.number().integer().min(mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT).max(mtablesConstants.FINANCIAL_SETTINGS.MAX_TABLE_CAPACITY).optional().messages({
    'number.base': 'amount must be a number',
    'number.min': 'amount must be at minimum',
    'number.max': 'amount must be at most max',
  }),
  depositAmount: Joi.number().amount().optional().messages({
    'number.base': 'amount must be a number',
    'amount.amount': 'amount must be an amount',
  }),
});

const updateReservationSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  date: Joi.string().isoDate().optional().messages({
    'string.base': 'Date must be a string',
    'string.isoDate': 'Invalid date format',
  }),
  time: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.base': 'Time must be a',
    'string.pattern.base': 'Invalid time format (HH:MM),
  }),
partySize: Joi.number().integer().min(mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY).max(mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY).optional().messages({
    'number.base': 'Party size must be a number',
    'number.integer': 'Party size must be an integer',
    'number.min': 'Party size too small',
    'number.max': 'Party size too large',
    'number.partySize': 'size',
  }),
  dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional().messages({
    'array.base': 'Dietary preferences must be an array',
    'any.only': 'Invalid dietary preference',
  }),
  specialRequests: Joi.string().max(400).optional().messages({
    'string.base': 'Special requests must be a string',
    'string.max': 'Special requests too long',
  }),
  seatingPreference: Joi.string().valid(...mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES).optional().messages({
    'string.base': 'Seating preference must be a string',
    'any.only': 'Invalid seating preference',
  }),
});

const bookingIdSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
});

const checkInSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  qrCode: Joi.string().when('method', {
    is: mtablesConstants.CHECK_IN_METHODS[0],
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'string.base': 'QR code must be a string',
    'any.required': 'QR code is required for qr_code method',
  }),
  method: Joi.string().valid(...mtablesConstants.CHECK_IN_METHODS).required().messages({
    'string.base': 'Method must be a string',
    'any.only': 'Invalid check-in method',
    'any.required': 'Method is required',
  }),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).optional().messages({
    'object.base': 'Coordinates must be an object',
    'any.required': 'Latitude and longitude are required',
  }),
});

const submitFeedbackSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  rating: Joi.number().integer().min(mtablesConstants.FEEDBACK_SETTINGS.MIN_RATING).max(mtablesConstants.FEEDBACK_SETTINGS.MAX_RATING).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  comment: Joi.string().max(500).optional().messages({
    'string.base': 'Comment must be a string',
    'string.max': 'Comment too long',
  }),
});

const addPartyMemberSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
    'any.required': 'Booking ID is required',
  }),
  friendCustomerId: Joi.number().integer().positive().required().messages({
    'number.base': 'Friend customer ID must be a number',
    'number.integer': 'Friend customer ID must be an integer',
    'number.positive': 'Friend customer ID must be positive',
    'any.required': 'Friend customer ID is required',
  }),
  inviteMethod: Joi.string().valid(...mtablesConstants.GROUP_SETTINGS.INVITE_METHODS).required().messages({
    'string.base': 'Invite method must be a string',
    'any.only': 'Invalid invite method',
    'any.required': 'Invite method is required',
  }),
});

const searchAvailableTablesSchema = Joi.object({
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required().messages({
    'object.base': 'Coordinates must be an object',
    'any.required': 'Coordinates are required',
  }),
  radius: Joi.number().positive().required().messages({
    'number.base': 'Radius must be a number',
    'number.positive': 'Radius must be positive',
    'any.required': 'Radius is required',
  }),
  date: Joi.string().isoDate().required().messages({
    'string.base': 'Date must be a string',
    'string.isoDate': 'Invalid date format',
    'any.required': 'Date is required',
  }),
  time: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.base': 'Time must be a string',
    'string.pattern.base': 'Invalid time format (HH:MM)',
    'any.required': 'Time is required',
  }),
  partySize: Joi.number().integer().min(mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY).max(mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY).required().messages({
    'number.base': 'Party size must be a number',
    'number.integer': 'Party size must be an integer',
    'number.min': 'Party size too small',
    'number.max': 'Party size too large',
    'any.required': 'Party size is required',
  }),
  seatingPreference: Joi.string().valid(...mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES).optional().messages({
    'string.base': 'Seating preference must be a string',
    'any.only': 'Invalid seating preference',
  }),
});

const validateCreateReservation = (req, res, next) => {
  logger.info('Validating create reservation request', { requestId: req.id });
  const { error } = createReservationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.BOOKING_CREATION_FAILED));
  }
  next();
};

const validateUpdateReservation = (req, res, next) => {
  logger.info('Validating update reservation request', { requestId: req.id });
  const { error } = updateReservationSchema.validate({ bookingId: req.params.bookingId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.BOOKING_UPDATE_FAILED));
  }
  next();
};

const validateBookingId = (req, res, next) => {
  logger.info('Validating booking ID', { requestId: req.id });
  const { error } = bookingIdSchema.validate({ bookingId: req.params.bookingId }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND));
  }
  next();
};

const validateCheckIn = (req, res, next) => {
  logger.info('Validating check-in request', { requestId: req.id });
  const { error } = checkInSchema.validate({ bookingId: req.params.bookingId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.CHECK_IN_FAILED));
  }
  next();
};

const validateSubmitFeedback = (req, res, next) => {
  logger.info('Validating submit feedback request', { requestId: req.id });
  const { error } = submitFeedbackSchema.validate({ bookingId: req.params.bookingId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.FEEDBACK_SUBMISSION_FAILED));
  }
  next();
};

const validateAddPartyMember = (req, res, next) => {
  logger.info('Validating add party member request', { requestId: req.id });
  const { error } = addPartyMemberSchema.validate({ bookingId: req.params.bookingId, ...req.body }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.PARTY_MEMBER_ADDITION_FAILED));
  }
  next();
};

const validateSearchAvailableTables = (req, res, next) => {
  logger.info('Validating search available tables request', { requestId: req.id });
  const { error } = searchAvailableTablesSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.TABLE_SEARCH_FAILED));
  }
  next();
};

module.exports = {
  validateCreateReservation,
  validateUpdateReservation,
  validateBookingId,
  validateCheckIn,
  validateSubmitFeedback,
  validateAddPartyMember,
  validateSearchAvailableTables,
};