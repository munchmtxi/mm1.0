// orderValidator.js
// Validation schemas for staff munch order endpoints.

'use strict';

const Joi = require('joi');

const confirmTakeawayOrderSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const prepareDeliveryFoodSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
  items: Joi.array().items(
    Joi.object({
      menu_item_id: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().positive().required(),
      customization: Joi.string().optional().allow(null, ''),
    })
  ).min(1).required(),
});

const logOrderCompletionSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  confirmTakeawayOrderSchema,
  prepareDeliveryFoodSchema,
  logOrderCompletionSchema,
};