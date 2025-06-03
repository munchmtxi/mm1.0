'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/common/paymentConstants');

const splitPaymentSchema = Joi.object({
  serviceId: Joi.number().integer().required(),
  serviceType: Joi.string().valid('order', 'in_dining_order', 'booking', 'ride', 'event').required(),
  payments: Joi.array().items(
    Joi.object({
      customerId: Joi.number().integer().required(),
      amount: Joi.number().positive().required(),
      paymentMethod: Joi.string().valid(...paymentConstants.PAYMENT_METHODS).required(),
    })
  ).min(1).required(),
});

const refundSplitPaymentSchema = Joi.object({
  serviceId: Joi.number().integer().required(),
  serviceType: Joi.string().valid('order', 'in_dining_order', 'booking', 'ride', 'event').required(),
  refunds: Joi.array().items(
    Joi.object({
      customerId: Joi.number().integer().required(),
      amount: Joi.number().positive().required(),
    })
  ).min(1).required(),
});

module.exports = { splitPaymentSchema, refundSplitPaymentSchema };