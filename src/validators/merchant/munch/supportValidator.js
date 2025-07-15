'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const handleOrderInquirySchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  issue: Joi.object({
    type: Joi.string().valid(...munchConstants.SUPPORT_CONSTANTS.ISSUE_TYPES).required(),
    description: Joi.string().trim().min(1).required(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
  }).required(),
});

const resolveOrderDisputeSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  resolution: Joi.object({
    action: Joi.string().valid(...munchConstants.SUPPORT_CONSTANTS.RESOLUTION_ACTIONS).required(),
    details: Joi.string().trim().min(1).required(),
  }).required(),
});

const shareOrderPoliciesSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
});

const validateHandleOrderInquiry = (req, res, next) => {
  const { error } = handleOrderInquirySchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateResolveOrderDispute = (req, res, next) => {
  const { error } = resolveOrderDisputeSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

const validateShareOrderPolicies = (req, res, next) => {
  const { error } = shareOrderPoliciesSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'munch', 'en', 'errors.invalidInput'), 400, munchConstants.ERROR_CODES[0]);
  next();
};

module.exports = {
  validateHandleOrderInquiry,
  validateResolveOrderDispute,
  validateShareOrderPolicies,
};