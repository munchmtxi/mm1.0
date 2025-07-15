'use strict';

const Joi = require('joi');
const { localizationConstants } = require('@constants/common/localizationConstants');
const munchConstants = require('@constants/customer/munch/munchConstants');

/**
 * Joi validation schemas for delivery-related endpoints.
 */
module.exports = {
  trackDelivery: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
  },
  cancelDelivery: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      reason: Joi.string().min(5).max(500).required(),
    }),
  },
  communicateWithDriver: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      message: Joi.string().min(1).max(1000).required(),
    }),
  },
  requestFeedback: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
  },
  updateDeliveryStatus: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      status: Joi.string().valid(...munchConstants.DELIVERY_STATUSES).required(),
    }),
  },
  processDriverEarnings: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
  },
  updateDriverLocation: {
    body: Joi.object({
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
      }).required(),
      countryCode: Joi.string().valid(...localizationConstants.SUPPORTED_COUNTRIES).default('US'),
    }),
  },
  getAddressPredictions: {
    query: Joi.object({
      input: Joi.string().min(3).max(100).required(),
      countryCode: Joi.string().valid(...localizationConstants.SUPPORTED_COUNTRIES).default('US'),
    }),
  },
  updateDeliveryLocation: {
    params: Joi.object({
      orderId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      placeId: Joi.string().max(100).required(),
      countryCode: Joi.string().valid(...localizationConstants.SUPPORTED_COUNTRIES).default('US'),
    }),
  },
};