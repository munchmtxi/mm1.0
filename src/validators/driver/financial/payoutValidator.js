'use strict';

const Joi = require('joi');
const payoutConstants = require('@constants/payoutConstants');

const requestPayoutSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  amount: Joi.number()
    .min(payoutConstants.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT)
    .max(payoutConstants.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT)
    .required(),
  method: Joi.string()
    .valid(...payoutConstants.SUPPORTED_PAYOUT_METHODS)
    .required(),
}).unknown(false);

const getPayoutHistorySchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const verifyPayoutMethodSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  method: Joi.string()
    .valid(...payoutConstants.SUPPORTED_PAYOUT_METHODS)
    .required(),
}).unknown(false);

const scheduleRecurringPayoutSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  frequency: Joi.string()
    .valid(...payoutConstants.SUPPORTED_FREQUENCIES)
    .required(),
  amount: Joi.number()
    .min(payoutConstants.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT)
    .max(payoutConstants.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT)
    .required(),
  method: Joi.string()
    .valid(...payoutConstants.SUPPORTED_PAYOUT_METHODS)
    .required(),
}).unknown(false);

module.exports = {
  requestPayout: requestPayoutSchema,
  getPayoutHistory: getPayoutHistorySchema,
  verifyPayoutMethod: verifyPayoutMethodSchema,
  scheduleRecurringPayout: scheduleRecurringPayoutSchema,
};