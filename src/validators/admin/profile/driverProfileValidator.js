'use strict';

/**
 * Driver Profile Validator
 * Validates input data for admin driver profile operations, ensuring compliance with
 * admin and driver constants, including localization, vehicle types, and certifications.
 */

const Joi = require('joi');
const { ADMIN_SETTINGS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const {
  DRIVER_SETTINGS,
  PROFILE_CONSTANTS,
  WALLET_CONSTANTS,
  COMPLIANCE_CONSTANTS,
} = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const phoneNumberPattern = /^\+\d{1,3}\d{9,15}$/;

const validateCreateDriver = Joi.object({
  user_id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(100).required(),
  phone_number: Joi.string().pattern(phoneNumberPattern).required(),
  license_number: Joi.string().min(5).max(50).required(),
  vehicle_info: Joi.object({
    type: Joi.string().valid(...Object.values(PROFILE_CONSTANTS.VEHICLE_TYPES)).required(),
    capacity: Joi.number().min(1).max(DRIVER_SETTINGS.MAX_PASSENGERS).required(),
  }).required(),
  preferred_language: Joi.string().valid(...DRIVER_SETTINGS.SUPPORTED_LANGUAGES).default(DRIVER_SETTINGS.DEFAULT_LANGUAGE),
  service_area: Joi.object({
    country: Joi.string().valid(...Object.keys(DRIVER_SETTINGS.SUPPORTED_CITIES)).optional(),
  }).optional(),
}).required();

const validateUpdateProfile = Joi.object({
  name: Joi.string().min(3).max(100),
  phone_number: Joi.string().pattern(phoneNumberPattern),
  license_number: Joi.string().min(5).max(50),
  vehicle_info: Joi.object({
    type: Joi.string().valid(...Object.values(PROFILE_CONSTANTS.VEHICLE_TYPES)),
    capacity: Joi.number().min(1).max(DRIVER_SETTINGS.MAX_PASSENGERS),
  }),
  preferred_language: Joi.string().valid(...DRIVER_SETTINGS.SUPPORTED_LANGUAGES),
  service_area: Joi.object({
    country: Joi.string().valid(...Object.keys(DRIVER_SETTINGS.SUPPORTED_CITIES)),
  }),
}).min(1);

const validateCertification = Joi.object({
  type: Joi.string().valid(...Object.values(PROFILE_CONSTANTS.CERTIFICATIONS)).required(),
  file: Joi.object({
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'application/pdf').required(),
    size: Joi.number().max(5 * 1024 * 1024).required(), // 5MB max
  }).required(),
  fileUrl: Joi.string().uri().optional(),
}).required();

const validateCountry = Joi.string()
  .valid(...Object.keys(DRIVER_SETTINGS.SUPPORTED_CITIES))
  .required();

const validateWalletSettings = Joi.object({
  paymentMethod: Joi.object({
    type: Joi.string().valid(...WALLET_CONSTANTS.PAYOUT_SETTINGS.SUPPORTED_PAYOUT_METHODS).required(),
    details: Joi.object().required(),
  }).optional(),
  withdrawal: Joi.object({
    amount: Joi.number().min(WALLET_CONSTANTS.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT).max(WALLET_CONSTANTS.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT).required(),
    currency: Joi.string().valid(...DRIVER_SETTINGS.SUPPORTED_CURRENCIES).required(),
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
  validateCreateDriver: (req, res, next) => validateRequest(validateCreateDriver, req.body, next),
  validateUpdateProfile: (req, res, next) => validateRequest(validateUpdateProfile, req.body, next),
  validateCertification: (req, res, next) => validateRequest(validateCertification, req.body, next),
  validateCountry: (req, res, next) => validateRequest(validateCountry, req.body.country, next),
  validateWalletSettings: (req, res, next) => validateRequest(validateWalletSettings, req.body, next),
};