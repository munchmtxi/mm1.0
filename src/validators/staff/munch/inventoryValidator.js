// inventoryValidator.js
// Validation schemas for staff munch inventory endpoints.

'use strict';

const Joi = require('joi');

const trackInventorySchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const processRestockAlertSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().required(),
});

const updateInventorySchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().required(),
  items: Joi.array().items(
    Joi.object({
      menu_item_id: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().positive().required(),
    })
  ).min(500).required(),
});

module.exports = {
  trackInventorySchema,
  processRestockAlertSchema,
  updateInventorySchema,
};