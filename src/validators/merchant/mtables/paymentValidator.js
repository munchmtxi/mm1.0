'use strict';

const Joi = require('joi');
const mTablesConstants = require('@constants/mTablesConstants');
const { AppError } = require('@utils/AppError');

const processPaymentSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  walletId: Joi.number().integer().positive().required(),
  paymentMethodId: Joi.number().integer().positive().optional(),
});

const manageSplitPaymentsSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  payments: Joi.array()
    .items(
      Joi.object({
        customerId: Joi.number().integer().positive().required(),
        amount: Joi.number().positive().required(),
        walletId: Joi.number().integer().positive().required(),
        paymentMethodId: Joi.number().integer().positive().optional(),
      })
    )
    .min(1)
    .required(),
});

const issueRefundSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  walletId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
});

const validateProcessPayment = (req, res, next) => {
  const { error } = processPaymentSchema.validate(req.body);
  if (error) throw new AppError(error.message, 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateManageSplitPayments = (req, res, next) => {
  const { error } = manageSplitPaymentsSchema.validate(req.body);
  if (error) throw new AppError(error.message, 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateIssueRefund = (req, res, next) => {
  const { error } = issueRefundSchema.validate(req.body);
  if (error) throw new AppError(error.message, 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

module.exports = { validateProcessPayment, validateManageSplitPayments, validateIssueRefund };