'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/paymentConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');

const processPaymentSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_payment_details'),
      'number.integer': formatMessage('error.missing_payment_details'),
      'number.positive': formatMessage('error.missing_payment_details'),
      'any.required': formatMessage('error.missing_payment_details'),
    }),
  amount: Joi.number()
    .positive()
    .min(paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT)
    .max(paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT)
    .required()
    .messages({
      'number.base': formatMessage('error.missing_payment_details'),
      'number.positive': formatMessage('error.missing_payment_details'),
      'number.min': formatMessage('error.invalid_payment_amount', {
        min: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT,
        max: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT,
      }),
      'number.max': formatMessage('error.invalid_payment_amount', {
        min: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT,
        max: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT,
      }),
      'any.required': formatMessage('error.missing_payment_details'),
    }),
  walletId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_payment_details'),
      'number.integer': formatMessage('error.missing_payment_details'),
      'number.positive': formatMessage('error.missing_payment_details'),
      'any.required': formatMessage('error.missing_payment_details'),
    }),
});

const splitPaymentsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_split_payment_details'),
      'number.integer': formatMessage('error.missing_split_payment_details'),
      'number.positive': formatMessage('error.missing_split_payment_details'),
      'any.required': formatMessage('error.missing_split_payment_details'),
    }),
  payments: Joi.array()
    .min(1)
    .items(
      Joi.object({
        customerId: Joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': formatMessage('error.missing_split_payment_details'),
            'number.integer': formatMessage('error.missing_split_payment_details'),
            'number.positive': formatMessage('error.missing_split_payment_details'),
            'any.required': formatMessage('error.missing_split_payment_details'),
          }),
        amount: Joi.number()
          .positive()
          .required()
          .messages({
            'number.base': formatMessage('error.missing_split_payment_details'),
            'number.positive': formatMessage('error.missing_split_payment_details'),
            'any.required': formatMessage('error.missing_split_payment_details'),
          }),
        walletId: Joi.number()
          .integer()
          .positive()
          .required()
          .messages({
            'number.base': formatMessage('error.missing_split_payment_details'),
            'number.integer': formatMessage('error.missing_split_payment_details'),
            'number.positive': formatMessage('error.missing_split_payment_details'),
            'any.required': formatMessage('error.missing_split_payment_details'),
          }),
      })
    )
    .required()
    .messages({
      'array.min': formatMessage('error.missing_split_payment_details'),
      'any.required': formatMessage('error.missing_split_payment_details'),
    }),
});

const refundSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_refund_details'),
      'number.integer': formatMessage('error.missing_refund_details'),
      'number.positive': formatMessage('error.missing_refund_details'),
      'any.required': formatMessage('error.missing_refund_details'),
    }),
  walletId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_refund_details'),
      'number.integer': formatMessage('error.missing_refund_details'),
      'number.positive': formatMessage('error.missing_refund_details'),
      'any.required': formatMessage('error.missing_refund_details'),
    }),
});

module.exports = {
  processPayment: { body: processPaymentSchema },
  manageSplitPayments: { body: splitPaymentsSchema },
  issueRefund: { body: refundSchema },
};