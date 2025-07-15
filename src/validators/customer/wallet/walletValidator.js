'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/common/paymentConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const localizationConstants = require('@constants/common/localizationConstants');

const walletIdSchema = Joi.string().uuid().required().messages({
  'string.uuid': 'Wallet ID must be a valid UUID',
  'any.required': 'Wallet ID is required',
});

const amountSchema = Joi.number().positive().precision(2).required().messages({
  'number.base': 'Amount must be a number',
  'number.positive': 'Amount must be positive',
  'number.precision': 'Amount must have at most 2 decimal places',
  'any.required': 'Amount is required',
});

const languageCodeSchema = Joi.string()
  .valid(...localizationConstants.SUPPORTED_LANGUAGES)
  .default(localizationConstants.DEFAULT_LANGUAGE)
  .messages({
    'any.only': 'Invalid language code',
  });

module.exports = {
  createWallet: Joi.object({
    languageCode: languageCodeSchema,
  }),

  addFunds: Joi.object({
    walletId: walletIdSchema,
    amount: amountSchema
      .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'DEPOSIT').min)
      .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'DEPOSIT').max)
      .messages({
        'number.min': 'Amount below minimum deposit limit',
        'number.max': 'Amount exceeds maximum deposit limit',
      }),
    paymentMethod: Joi.object({
      type: Joi.string()
        .valid(...paymentConstants.PAYMENT_METHODS)
        .required()
        .messages({
          'any.only': 'Invalid payment method type',
          'any.required': 'Payment method type is required',
        }),
      id: Joi.string().required().messages({
        'any.required': 'Payment method ID is required',
      }),
    }).required(),
    languageCode: languageCodeSchema,
  }),

  withdrawFunds: Joi.object({
    walletId: walletIdSchema,
    amount: amountSchema
      .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL').min)
      .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL').max)
      .messages({
        'number.min': 'Amount below minimum withdrawal limit',
        'number.max': 'Amount exceeds maximum withdrawal limit',
      }),
    destination: Joi.object({
      accountNumber: Joi.string().required().messages({
        'any.required': 'Account number is required',
      }),
      bankName: Joi.string().required().messages({
        'any.required': 'Bank name is required',
      }),
      id: Joi.string().required().messages({
        'any.required': 'Destination ID is required',
      }),
    }).required(),
    languageCode: languageCodeSchema,
  }),

  payWithWallet: Joi.object({
    walletId: walletIdSchema,
    serviceId: Joi.string().required().messages({
      'any.required': 'Service ID is required',
    }),
    amount: amountSchema
      .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').min)
      .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').max)
      .messages({
        'number.min': 'Amount below minimum payment limit',
        'number.max': 'Amount exceeds maximum payment limit',
      }),
    languageCode: languageCodeSchema,
  }),

  getWalletBalance: Joi.object({
    walletId: walletIdSchema,
    languageCode: languageCodeSchema,
  }),

  getWalletTransactions: Joi.object({
    walletId: walletIdSchema,
    languageCode: languageCodeSchema,
  }),

  creditWalletForReward: Joi.object({
    walletId: walletIdSchema,
    amount: amountSchema
      .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'GAMIFICATION_REWARD').min)
      .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'GAMIFICATION_REWARD').max)
      .messages({
        'number.min': 'Amount below minimum reward limit',
        'number.max': 'Amount exceeds maximum reward limit',
      }),
    rewardId: Joi.string().required().messages({
      'any.required': 'Reward ID is required',
    }),
    description: Joi.string().required().messages({
      'any.required': 'Description is required',
    }),
    languageCode: languageCodeSchema,
  }),
};