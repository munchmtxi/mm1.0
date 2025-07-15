'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const encryptSensitiveDataSchema = Joi.object({
  type: Joi.string().optional(),
  content: Joi.any().required(),
});

const restrictDataAccessSchema = Joi.object({
  userId: Joi.number().required(),
  permission: Joi.string()
    .valid(...Object.values(merchantConstants.SECURITY_CONSTANTS.PERMISSION_LEVELS))
    .required(),
});

const validateEncryptSensitiveData = (req, res, next) => {
  const { error } = encryptSensitiveDataSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'security', 'en', 'errors.invalidInput'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateComplyWithRegulations = (req, res, next) => {
  next(); // No body validation needed
};

const validateRestrictDataAccess = (req, res, next) => {
  const { error } = restrictDataAccessSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'security', 'en', 'errors.invalidPermission'),
      400,
      merchantConstants.ERROR_CODES[3]
    );
  }
  next();
};

const validateAuditDataSecurity = (req, res, next) => {
  next(); // No body validation needed
};

module.exports = {
  validateEncryptSensitiveData,
  validateComplyWithRegulations,
  validateRestrictDataAccess,
  validateAuditDataSecurity,
};