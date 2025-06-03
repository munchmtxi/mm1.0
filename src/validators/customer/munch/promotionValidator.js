'use strict';

const Joi = require('joi');

const redeemPromotionSchema = Joi.object({
  promotionId: Joi.number().integer().required(),
  orderId: Joi.number().integer().optional(),
});

const getAvailablePromotionsSchema = Joi.object({});

module.exports = { redeemPromotionSchema, getAvailablePromotionsSchema };