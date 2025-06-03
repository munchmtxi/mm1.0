'use strict';

const Joi = require('joi');

const trackDeliveryStatusSchema = Joi.object({
  orderId: Joi.number().integer().required(),
});

const cancelDeliverySchema = Joi.object({
  orderId: Joi.number().integer().required(),
});

const communicateWithDriverSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  message: Joi.string().trim().min(1).max(500).required(),
});

module.exports = { trackDeliveryStatusSchema, cancelDeliverySchema, communicateWithDriverSchema };