'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mtablesConstants = require('@constants/mtablesConstants');

const createSupportTicketSchema = Joi.object({
  bookingId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Booking ID must be a number',
    'number.integer': 'Booking ID must be an integer',
    'number.positive': 'Booking ID must be positive',
  }),
  orderId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
  }),
  issueType: Joi.string()
    .valid(...Object.values(mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES))
    .required()
    .messages({
      'string.base': 'Issue type must be a string',
      'any.only': 'Invalid issue type',
      'any.required': 'Issue type is required',
    }),
  description: Joi.string()
    .max(mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH)
    .required()
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description too long',
      'any.required': 'Description is required',
    }),
});

const ticketIdSchema = Joi.object({
  ticketId: Joi.number().integer().positive().required().messages({
    'number.base': 'Ticket ID must be a number',
    'number.integer': 'Ticket ID must be an integer',
    'number.positive': 'Ticket ID must be positive',
    'any.required': 'Ticket ID is required',
  }),
});

const validateCreateSupportTicket = (req, res, next) => {
  logger.info('Validating create support ticket request', { requestId: req.id });
  const { error } = createSupportTicketSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'SUPPORT_TICKET_CREATION_FAILED') || 'SUPPORT_TICKET_CREATION_FAILED'));
  }
  next();
};

const validateTicketId = (req, res, next) => {
  logger.info('Validating ticket ID', { requestId: req.id });
  const { error } = ticketIdSchema.validate({ ticketId: req.params.ticketId }, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { requestId: req.id, error: errorMessages });
    return next(new AppError(errorMessages, 400, mtablesConstants.ERROR_CODES.find(c => c === 'TICKET_NOT_FOUND') || 'TICKET_NOT_FOUND'));
  }
  next();
};

module.exports = {
  validateCreateSupportTicket,
  validateTicketId,
};