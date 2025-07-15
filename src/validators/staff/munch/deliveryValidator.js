// deliveryValidator.js
// Validation schemas for staff munch delivery endpoints.

'use strict';

const Joi = require('joi');

const assignDriverSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const prepareDeliveryPackageSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const trackDriverStatusSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
});

module.exports = {
  assignDriverSchema,
  prepareDeliveryPackageSchema,
  trackDriverStatusSchema,
};