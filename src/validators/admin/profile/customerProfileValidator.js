'use strict';

/**
 * Customer Profile Validator
 * Validates input data for admin customer profile operations, ensuring compliance with
 * admin and customer constants, including localization and dietary preferences.
 */

const Joi = require('joi');
const { ADMIN_SETTINGS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const { CUSTOMER_SETTINGS, ACCESSIBILITY_CONSTANTS, WALLET_CONSTANTS } = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const phoneNumberPattern = /^\+\d{1,3}\d{9,15}$/;

const validateCreateCustomer = Joi.object({
  user_id: Joi.string().uuid().required(),
  phone_number: Joi.string().pattern(phoneNumberPattern).required(),
  address: Joi.object({
    street: Joi.string().min(3).max(200).required(),
    city: Joi.string().valid(...Object.values(CUSTOMER_SETTINGS.SUPPORTED_CITIES).flat()).required(),
    country: Joi.string().valid(...Object.keys(CUSTOMER_SETTINGS.SUPPORTED_CITIES)).required(),
    postal_code: Joi.string().min(3).max(20).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  country: Joi.string().valid(...Object.keys(CUSTOMER_SETTINGS.SUPPORTED_CITIES)).required(),
  preferred_language: Joi.string().valid(...CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).default(CUSTOMER_SETTINGS.DEFAULT_LANGUAGE),
  preferences: Joi.object({
    dietary: Joi.array().items(Joi.string().valid(...ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS)).optional(),
  }).optional(),
}).required();

const validateUpdateProfile = Joi.object({
  phone_number: Joi.string().pattern(phoneNumberPattern),
  address: Joi.object({
    street: Joi.string().min(3).max(200),
    city: Joi.string().valid(...Object.values(CUSTOMER_SETTINGS.SUPPORTED_CITIES).flat()),
    country: Joi.string().valid(...Object.keys(CUSTOMER_SETTINGS.SUPPORTED_CITIES)),
    postal_code: Joi.string().min(3).max(20),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
  preferred_language: Joi.string().valid(...CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES),
  preferences: Joi.object({
    dietary: Joi.array().items(Joi.string().valid(...ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS)),
  }),
}).min(1);

const validateCountry = Joi.string()
  .valid(...Object.keys(CUSTOMER_SETTINGS.SUPPORTED_CITIES))
  .required();

const validateLanguage = Joi.string()
  .valid(...CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES)
  .required();

const validateDietaryPreferences = Joi.array()
  .items(Joi.string().valid(...ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS))
  .required();

const validateWalletSettings = Joi.object({
  paymentMethod: Joi.object({
    type: Joi.string().valid(...Object.values(WALLET_CONSTANTS.PAYMENT_METHODS)).required(),
    details: Joi.object().required(),
  }).optional(),
  withdrawal: Joi.object({
    amount: Joi.number().min(WALLET_CONSTANTS.WALLET_SETTINGS.MIN_WITHDRAWAL_AMOUNT).max(WALLET_CONSTANTS.WALLET_SETTINGS.MAX_WITHDRAWAL_AMOUNT).required(),
    currency: Joi.string().valid(...CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES).required(),
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
  validateCreateCustomer: (req, res, next) => validateRequest(validateCreateCustomer, req.body, next),
  validateUpdateProfile: (req, res, next) => validateRequest(validateUpdateProfile, req.body, next),
  validateCountry: (req, res, next) => validateRequest(validateCountry, req.body.country, next),
  validateLanguage: (req, res, next) => validateRequest(validateLanguage, req.body.language, next),
  validateDietaryPreferences: (req, res, next) => validateRequest(validateDietaryPreferences, req.body.preferences, next),
  validateWalletSettings: (req, res, next) => validateRequest(validateWalletSettings, req.body, next),
};