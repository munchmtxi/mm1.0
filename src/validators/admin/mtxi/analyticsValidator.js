'use strict';

const Joi = require('joi');
const rideConstants = require('@constants/common/rideConstants');

const driverIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'Driver ID must be a number',
  'number.integer': 'Driver ID must be an integer',
  'number.positive': 'Driver ID must be positive',
  'any.required': 'Driver ID is required',
});

const getRideAnalyticsSchema = Joi.object({
  driverId: driverIdSchema,
});

const getTipAnalyticsSchema = Joi.object({
  driverId: driverIdSchema,
});

const exportRideReportsSchema = Joi.object({
  driverId: driverIdSchema,
  format: Joi.string()
    .valid(...rideConstants.ANALYTICS_CONSTANTS.REPORT_FORMATS)
    .default('json')
    .messages({
      'any.only': 'Invalid report format',
    }),
  period: Joi.string()
    .valid(...rideConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS)
    .default('monthly')
    .messages({
      'any.only': 'Invalid report period',
    }),
});

const analyzeDriverPerformanceSchema = Joi.object({
  driverId: driverIdSchema,
});

module.exports = {
  getRideAnalyticsSchema,
  getTipAnalyticsSchema,
  exportRideReportsSchema,
  analyzeDriverPerformanceSchema,
};