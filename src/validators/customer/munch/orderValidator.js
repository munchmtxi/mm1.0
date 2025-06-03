'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/customer/munch/munchConstants');

const browseMerchantsSchema = Joi.object({
  latitude: Joi.number().required().min(-90).max(90),
  longitude: Joi.number().required().min(-180).max(180),
  radiusKm: Joi.number().required().min(1).max(munchConstants.MUNCH_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM),
  filters: Joi.object({
    dietaryPreferences: Joi.array().items(Joi.string().valid(...munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
    merchantType: Joi.string().valid(...munchConstants.MUNCH_CONSTANTS.SUPPORTED_MERCHANT_TYPES).optional(),
    orderType: Joi.string().valid(...munchConstants.ORDER_CONSTANTS.ORDER_TYPES).optional(),
  }).optional(),
});

const addToCartSchema = Joi.object({
  itemId: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
  customizations: Joi.object({
    dietaryPreferences: Joi.array().items(Joi.string().valid(...munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
    toppings: Joi.array().items(Joi.string()).optional(),
    size: Joi.string().optional(),
    extras: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

const updateCartSchema = Joi.object({
  cartId: Joi.number().integer().required(),
  items: Joi.array().items(
    Joi.object({
      itemId: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(0).required(),
      customizations: Joi.object({
        dietaryPreferences: Joi.array().items(Joi.string().valid(...munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
        toppings: Joi.array().items(Joi.string()).optional(),
        size: Joi.string().optional(),
        extras: Joi.array().items(Joi.string()).optional(),
      }).optional(),
    })
  ).required(),
});

const placeOrderSchema = Joi.object({
  cartId: Joi.number().integer().required(),
  branchId: Joi.number().integer().required(),
  deliveryLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
  }).optional(),
});

const updateOrderSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  items: Joi.array().items(
    Joi.object({
      itemId: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(0).required(),
      customizations: Joi.object({
        dietaryPreferences: Joi.array().items(Joi.string().valid(...munchConstants.ORDER_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
        toppings: Joi.array().items(Joi.string()).optional(),
        size: Joi.string().optional(),
        extras: Joi.array().items(Joi.string()).optional(),
      }).optional(),
    })
  ).required(),
});

const cancelOrderSchema = Joi.object({
  orderId: Joi.number().integer().required(),
});

module.exports = { browseMerchantsSchema, addToCartSchema, updateCartSchema, placeOrderSchema, updateOrderSchema, cancelOrderSchema };