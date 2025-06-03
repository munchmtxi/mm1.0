'use strict';

/**
 * Staff Profile Validator
 * Validates input data for admin staff profile operations, ensuring compliance with
 * admin and staff constants, including roles, localization, and wallet settings.
 */

const Joi = require('joi');
const { ADMIN_SETTINGS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const {
  STAFF_TYPES,
  STAFF_SETTINGS,
  STAFF_ROLES,
} = require('@constants/staff/staffRolesConstants');
const {
  STAFF_WALLET_CONSTANTS,
  STAFF_COMPLIANCE_CONSTANTS,
} = require('@constants/staff/staffSystemConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validateCreateStaff = Joi.object({
  user_id: Joi.string().uuid().required(),
  merchant_id: Joi.string().uuid().required(),
  branch_id: Joi.string().uuid().optional(),
  position: Joi.string().valid(...Object.keys(STAFF_ROLES)).required(),
  preferred_language: Joi.string()
    .valid(...STAFF_SETTINGS.SUPPORTED_LANGUAGES)
    .default(STAFF_SETTINGS.DEFAULT_LANGUAGE),
}).required();

const validateUpdateStaffDetails = Joi.object({
  branch_id: Joi.string().uuid().optional(),
  position: Joi.string().valid(...Object.keys(STAFF_ROLES)).optional(),
  preferred_language: Joi.string().valid(...STAFF_SETTINGS.SUPPORTED_LANGUAGES).optional(),
  certifications: Joi.array()
    .items(Joi.string().valid(...Object.values(STAFF_COMPLIANCE_CONSTANTS.CERTIFICATIONS)))
    .optional(),
}).min(1);

const validateCountry = Joi.string()
  .valid(...Object.keys(STAFF_SETTINGS.SUPPORTED_CITIES))
  .required();

const validateWalletSettings = Joi.object({
  paymentMethod: Joi.object({
    type: Joi.string().valid(...Object.values(STAFF_WALLET_CONSTANTS.PAYMENT_METHODS)).required(),
    details: Joi.object().required(),
  }).optional(),
  withdrawal: Joi.object({
    amount: Joi.number()
      .min(STAFF_WALLET_CONSTANTS.PAYOUT_SETTINGS.MIN_PAYOUT_AMOUNT)
      .max(STAFF_WALLET_CONSTANTS.PAYOUT_SETTINGS.MAX_PAYOUT_AMOUNT)
      .required(),
    currency: Joi.string().valid(...STAFF_SETTINGS.SUPPORTED_CURRENCIES).required(),
    paymentMethodId: Joi.string().required(),
    sessionToken: Joi.string().required(),
    ipAddress: Joi.string().ip().required(),
  }).optional(),
}).min(1);

const validateRequest = (schema, data, next) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed', { details: error.details });
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.details));
  }
  next();
};

module.exports = {
  validateCreateStaff: (req, res, next) => validateRequest(validateCreateStaff, req.body, next),
  validateUpdateStaffDetails: (req, res, next) => validateRequest(validateUpdateStaffDetails, req.body, next),
  validateCountry: (req, res, next) => validateRequest(validateCountry, req.body.country, next),
  validateWalletSettings: (req, res, next) => validateRequest(validateWalletSettings, req.body, next),
};