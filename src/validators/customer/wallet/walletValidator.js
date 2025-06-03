'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/common/paymentConstants');

const createWalletSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
});

const addFundsSchema = Joi.object({
  walletId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().min(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'DEPOSIT').min).max(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'DEPOSIT').max).required(),
  paymentMethod: Joi.object({
    type: Joi.string().valid(...paymentConstants.PAYMENT_METHODS).required(),
    id: Joi.number().integer().positive().required(),
  }).required(),
});

const withdrawFundsSchema = Joi.object({
  walletId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().min(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').min).max(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max).required(),
  destination: Joi.object({
    accountNumber: Joi.string().required(),
    bankName: Joi.string().required(),
    id: Joi.number().integer().positive().required(),
  }).required(),
});

const payWithWalletSchema = Joi.object({
  walletId: Joi.number().integer().positive().required(),
  serviceId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().min(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').min).max(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'PAYMENT').max).required(),
});

const creditWalletSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().min(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'GAMIFICATION_REWARD').min).max(paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'GAMIFICATION_REWARD').max).required(),
  currency: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES).required(),
  transactionType: Joi.string().valid(...paymentConstants.TRANSACTION_TYPES).required(),
  description: Joi.string().max(255).required(),
});

module.exports = {
  createWalletSchema,
  addFundsSchema,
  withdrawFundsSchema,
  payWithWalletSchema,
  creditWalletSchema,
};