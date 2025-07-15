// coordinationValidator.js
// Validation schemas for staff munch coordination endpoints.

'use strict';

const Joi = require('joi');

const coordinateDriverPickupSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const verifyDriverCredentialsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const logPickupTimeSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  coordinateDriverPickupSchema,
  verifyDriverCredentialsSchema,
  logPickupTimeSchema,
};