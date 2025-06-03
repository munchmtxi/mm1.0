'use strict';

const Joi = require('joi');

const getMenuItemsSchema = Joi.object({
  restaurantId: Joi.number().integer().required(),
});

const checkItemAvailabilitySchema = Joi.object({
  itemId: Joi.number().integer().required(),
});

module.exports = { getMenuItemsSchema, checkItemAvailabilitySchema };