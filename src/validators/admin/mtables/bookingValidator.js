'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');

const monitorBookingsSchema = Joi.object({
  restaurantId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_booking_details'),
      'number.integer': formatMessage('error.invalid_booking_details'),
      'number.positive': formatMessage('error.invalid_booking_details'),
      'any.required': formatMessage('error.invalid_booking_details'),
    }),
});

const manageTableAdjustmentsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_booking_details'),
      'number.integer': formatMessage('error.invalid_booking_details'),
      'number.positive': formatMessage('error.invalid_booking_details'),
      'any.required': formatMessage('error.invalid_booking_details'),
    }),
});

const manageTableAdjustmentsBodySchema = Joi.object({
  tableId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_table'),
      'number.integer': formatMessage('error.invalid_table'),
      'number.positive': formatMessage('error.invalid_table'),
      'any.required': formatMessage('error.invalid_table'),
    }),
  reason: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': formatMessage('error.invalid_reason'),
    }),
});

const closeBookingsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.invalid_booking_details'),
      'number.integer': formatMessage('error.invalid_booking_details'),
      'number.positive': formatMessage('error.invalid_booking_details'),
      'any.required': formatMessage('error.invalid_booking_details'),
    }),
});

module.exports = {
  monitorBookings: {
    params: monitorBookingsSchema,
  },
  manageTableAdjustments: {
    params: manageTableAdjustmentsSchema,
    body: manageTableAdjustmentsBodySchema,
  },
  closeBookings: {
    params: closeBookingsSchema,
  },
};