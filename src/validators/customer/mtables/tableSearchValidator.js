'use strict';

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

/** Validates table search request body */
const tableSearchSchema = Joi.object({
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  radius: Joi.number().positive().required(),
  date: Joi.string().custom((value, helpers) => {
    if (!dateTimeUtils.isValidDate(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }).required(),
  time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
  partySize: Joi.number()
    .integer()
    .min(customerConstants.MTABLES_CONSTANTS.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY)
    .max(customerConstants.MTABLES_CONSTANTS.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY)
    .required(),
  seatingPreference: Joi.string()
    .valid(...customerConstants.MTABLES_CONSTANTS.TABLE_MANAGEMENT.SEATING_PREFERENCES)
    .optional(),
});

module.exports = { tableSearchSchema };