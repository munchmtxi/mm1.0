'use strict';

const Joi = require('joi');
const mTablesConstants = require('@constants/common/mTablesConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const handleInquirySchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  customerId: Joi.number().integer().positive().required(),
  orderId: Joi.number().integer().positive().optional(),
  issueType: Joi.string()
    .valid(...mTablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES)
    .required(),
  description: Joi.string()
    .max(mTablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH)
    .required(),
  staffId: Joi.number().integer().positive().optional(),
});

const resolveDisputeSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  ticketId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
  resolutionDetails: Joi.string().max(1000).required(),
});

const communicatePoliciesSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
});

const validateHandleInquiry = (req, res, next) => {
  const { error } = handleInquirySchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateResolveDispute = (req, res, next) => {
  const { error } = resolveDisputeSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

const validateCommunicatePolicies = (req, res, next) => {
  const { error } = communicatePoliciesSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'mtables', 'en', 'errors.invalidInput'), 400, mTablesConstants.ERROR_CODES.INVALID_INPUT);
  next();
};

module.exports = { validateHandleInquiry, validateResolveDispute, validateCommunicatePolicies };