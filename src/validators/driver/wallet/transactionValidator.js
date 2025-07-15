'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');

const recordTransactionSchema = Joi.object({
  taskId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  type: Joi.string().valid(...driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES).required(),
});

const getTransactionHistorySchema = Joi.object({
  period: Joi.string().valid(...paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS).required(),
});

const reverseTransactionSchema = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

const exportTransactionDataSchema = Joi.object({
  format: Joi.string().valid('csv', 'json').required(),
});

module.exports = {
  recordTransaction: {
    body: recordTransactionSchema,
  },
  getTransactionHistory: {
    query: getTransactionHistorySchema,
  },
  reverseTransaction: {
    body: reverseTransactionSchema,
  },
  exportTransactionData: {
    query: exportTransactionDataSchema,
  },
};