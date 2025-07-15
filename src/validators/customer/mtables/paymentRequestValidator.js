// src/validators/customer/mtables/paymentRequestValidator.js
'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/common/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');

const paymentRequestSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  amount: Joi.number()
    .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'BOOKING_PAYMENT').min)
    .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'BOOKING_PAYMENT').max)
    .required(),
  billSplitType: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES).required(),
});

const preOrderPaymentRequestSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  orderId: Joi.number().integer().positive().required(),
  amount: Joi.number()
    .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').min)
    .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').max)
    .required(),
  billSplitType: Joi.string().valid(...socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES).required(),
});

module.exports = {
  paymentRequestSchema,
  preOrderPaymentRequestSchema,
};