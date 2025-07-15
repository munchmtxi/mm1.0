// walletValidator.js
// Validation schemas for wallet-related endpoints.

'use strict';

const Joi = require('joi');

const createWalletSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

const processPaymentSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  walletId: Joi.number().integer().positive().required(),
});

const processPayoutSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  recipientId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
});

const getBalanceSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

const getHistorySchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

module.exports = {
  createWalletSchema,
  processPaymentSchema,
  processPayoutSchema,
  getBalanceSchema,
  getHistorySchema,
};