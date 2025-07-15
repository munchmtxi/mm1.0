// orderValidator.js
// Validation schemas for staff mtables order endpoints.

'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');

const itemSchema = Joi.object({
  menu_item_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM).required(),
  customization: Joi.string().allow('').optional(),
});

const processExtraOrderSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  items: Joi.array().items(itemSchema).min(1).required(),
  staffId: Joi.number().integer().positive().required(),
});

const prepareDineInOrderSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  items: Joi.array().items(itemSchema).min(1).required(),
  staffId: Joi.number().integer().positive().required(),
});

const logOrderMetricsSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  processExtraOrderSchema,
  prepareDineInOrderSchema,
  logOrderMetricsSchema,
};