'use strict';

const Joi = require('joi');
const disputeConstants = require('@constants/disputeConstants');
const { formatMessage } = require('@utils/localizationService');

const idSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_issue'),
      'number.integer': formatMessage('error.invalid_issue'),
      'number.positive': formatMessage('error.invalid_issue'),
      'any.required': formatMessage('error.invalid_issue'),
    }),
});

const disputeIdSchema = Joi.object({
  disputeId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.dispute_not_found'),
      'number.integer': formatMessage('error.dispute_not_found'),
      'number.positive': formatMessage('error.dispute_not_found'),
      'any.required': formatMessage('error.dispute_not_found'),
    }),
});

const resolutionSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(disputeConstants.RESOLUTION_TYPES))
    .required()
    .messages({
      'string.base': formatMessage('error.invalid_resolution_type'),
      'any.required': formatMessage('error.invalid_resolution_type'),
      'any.only': formatMessage('error.invalid_resolution_type'),
    }),
  description: Joi.string().max(500).optional().messages({
    'string.max': formatMessage('error.invalid_description'),
  }),
});

module.exports = {
  resolveBookingDisputes: {
    params: idSchema,
    body: resolutionSchema,
  },
  resolvePreOrderDisputes: {
    params: idSchema,
    body: resolutionSchema,
  },
  trackDisputeStatus: {
    params: disputeIdSchema,
  },
  escalateDisputes: {
    params: disputeIdSchema,
  },
};