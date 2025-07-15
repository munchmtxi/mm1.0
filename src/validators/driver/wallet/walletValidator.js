'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');

const updateBalanceSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
  type: Joi.string().valid(...driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES).required(),
});

const lockBalanceSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
});

const unlockBalanceSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
});

module.exports = {
  getWalletBalance: object(),
  updateBalance: {
    body: updateBalanceSchema,
  },
  lockBalance: {
    body: lockBalanceSchema,
  },
  unlockBalance: {
    body: unlockBalanceSchema,
  },
};