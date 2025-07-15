// supplyValidator.js
// Validation schemas for staff mtables supply endpoints.

'use strict';

const Joi = require('joi');

const monitorSuppliesSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const requestRestockSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const logSupplyReadinessSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  monitorSuppliesSchema,
  requestRestockSchema,
  logSupplyReadinessSchema,
};