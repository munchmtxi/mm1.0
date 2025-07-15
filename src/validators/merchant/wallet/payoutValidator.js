// payoutValidator.js
// Validation schemas for payout-related endpoints.

'use strict';

const Joi = require('joi');

const configurePayoutSettingsSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  settings: Joi.object({
    schedule: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    method: Joi.string().valid('bank_transfer', 'mobile_money').required(),
    account_details: Joi.object().optional(),
  }).required(),
});

const processPayoutSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  recipientId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
});

const verifyPayoutMethodSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required(),
  method: Joi.object({
    type: Joi.string().valid('bank_transfer', 'mobile_money').required(),
    accountDetails: Joi.object({
      accountNumber: Joi.string().required(),
      bankCode: Joi.string().required(),
    }).required(),
  }).required(),
});

const getPayoutHistorySchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

module.exports = {
  configurePayoutSettingsSchema,
  processPayoutSchema,
  verifyPayoutMethodSchema,
  getPayoutHistorySchema,
};