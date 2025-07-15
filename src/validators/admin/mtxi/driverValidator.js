'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/common/driverConstants');

const driverIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'Driver ID must be a number',
  'number.integer': 'Driver ID must be an integer',
  'number.positive': 'Driver ID must be positive',
  'any.required': 'Driver ID is required',
});

const manageDriverAssignmentSchema = Joi.object({
  driverId: driverIdSchema,
  rideId: Joi.number().integer().positive().required().messages({
    'number.base': 'Ride ID must be a number',
    'number.integer': 'Ride ID must be an integer',
    'number.positive': 'Ride ID must be positive',
    'any.required': 'Ride ID is required',
  }),
});

const monitorDriverAvailabilitySchema = Joi.object({
  driverId: driverIdSchema,
});

const overseeSafetyReportsSchema = Joi.object({
  driverId: driverIdSchema,
});

const administerTrainingSchema = Joi.object({
  driverId: driverIdSchema,
  module: Joi.string()
    .valid(...driverConstants.ONBOARDING_CONSTANTS.TRAINING_MODULES)
    .required()
    .messages({
      'any.only': 'Invalid training module',
      'any.required': 'Training module is required',
    }),
  action: Joi.string()
    .valid('assign', 'complete', 'verify')
    .required()
    .messages({
      'any.only': 'Invalid training action',
      'any.required': 'Training action is required',
    }),
});

module.exports = {
  manageDriverAssignmentSchema,
  monitorDriverAvailabilitySchema,
  overseeSafetyReportsSchema,
  administerTrainingSchema,
};