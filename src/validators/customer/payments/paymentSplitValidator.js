'use strict';

/**
 * Joi validator for split payment and refund endpoints.
 */

const Joi = require('joi');
const AppError = require('@utils/AppError');
const paymentConstants = require('@constants/common/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');

/**
 * Joi schema for split payment request body.
 */
const splitPaymentSchema = Joi.object({
  serviceId: Joi.string()
    .required()
    .messages({
      'any.required': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
      'string.base': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
    }),
  serviceType: Joi.string()
    .valid('order', 'in_dining_order', 'booking', 'ride', 'event')
    .required()
    .messages({
      'any.required': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
      'any.only': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
    }),
  billSplitType: Joi.string()
    .valid(...socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.map(type => type.toLowerCase()))
    .required()
    .messages({
      'any.required': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_bill_split_type'),
      'any.only': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_bill_split_type'),
    }),
  payments: Joi.array()
    .min(1)
    .max(socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS)
    .items(
      Joi.object({
        customerId: Joi.string()
          .required()
          .messages({
            'any.required': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
            'string.base': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
          }),
        amount: Joi.number()
          .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).min)
          .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).max)
          .required()
          .messages({
            'any.required': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
            'number.base': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
            'number.min': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_amount_range', {
                min: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).min,
                max: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).max,
              }),
            'number.max': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_amount_range', {
                min: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).min,
                max: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT).max,
              }),
          }),
        paymentMethod: Joi.string()
          .valid(...paymentConstants.PAYMENT_METHODS.map(method => method.toLowerCase()))
          .required()
          .messages({
            'any.required': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
            'any.only': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payment_details'),
          }),
      })
    )
    .required()
    .messages({
      'array.base': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payments'),
      'array.min': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_payments'),
      'array.max': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.max_split_participants_exceeded', {
          max: socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS,
        }),
    }),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  })
    .optional()
    .messages({
      'object.base': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_location'),
    }),
});

/**
 * Joi schema for split payment refund request body.
 */
const splitPaymentRefundSchema = Joi.object({
  serviceId: Joi.string()
    .required()
    .messages({
      'any.required': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
      'string.base': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
    }),
  serviceType: Joi.string()
    .valid('order', 'in_dining_order', 'booking', 'ride', 'event')
    .required()
    .messages({
      'any.required': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
      'any.only': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_service'),
    }),
  refunds: Joi.array()
    .min(1)
    .items(
      Joi.object({
        customerId: Joi.string()
          .required()
          .messages({
            'any.required': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refund_details'),
            'string.base': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refund_details'),
          }),
        amount: Joi.number()
          .min(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).min)
          .max(paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).max)
          .required()
          .messages({
            'any.required': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refund_details'),
            'number.base': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refund_details'),
            'number.min': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_amount_range', {
                min: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).min,
                max: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).max,
              }),
            'number.max': ({ context }) =>
              formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_amount_range', {
                min: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).min,
                max: paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND).max,
              }),
          }),
      })
    )
    .required()
    .messages({
      'array.base': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refunds'),
      'array.min': ({ context }) =>
        formatMessage('customer', 'payments', context.languageCode || localizationConstants.DEFAULT_LANGUAGE, 'error.invalid_refunds'),
    }),
});

/**
 * Middleware to validate split payment request.
 */
exports.validateSplitPayment = async (req, res, next) => {
  try {
    await splitPaymentSchema.validateAsync(req.body, {
      context: { languageCode: req.user?.languageCode },
    });
    next();
  } catch (error) {
    next(
      new AppError(
        error.message,
        400,
        paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD,
        { validationErrors: error.details }
      )
    );
  }
};

/**
 * Middleware to validate split payment refund request.
 */
exports.validateSplitPaymentRefund = async (req, res, next) => {
  try {
    await splitPaymentRefundSchema.validateAsync(req.body, {
      context: { languageCode: req.user?.languageCode },
    });
    next();
  } catch (error) {
    next(
      new AppError(
        error.message,
        400,
        paymentConstants.ERROR_CODES.INVALID_AMOUNT,
        { validationErrors: error.details }
      )
    );
  }
};