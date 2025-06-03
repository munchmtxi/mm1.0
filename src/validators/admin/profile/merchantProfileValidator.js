'use strict';

/**
 * Merchant Profile Validator
 * Validates input data for admin merchant profile operations, ensuring compliance with
 * admin and merchant constants, including localization, business types, and media uploads.
 */

const Joi = require('joi');
const { ADMIN_SETTINGS, USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const {
  MERCHANT_TYPES,
  BRANCH_SETTINGS,
  WALLET_CONSTANTS,
  MUNCH_CONSTANTS,
} = require('@constants/merchant/merchantConstants');
const { BUSINESS_TYPE_CODES } = require('@constants/merchant/businessTypes');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const phoneNumberPattern = /^\+\d{1,3}\d{9,15}$/;

const validateCreateMerchant = Joi.object({
  user_id: Joi.string().uuid().required(),
  business_name: Joi.string().min(3).max(100).required(),
  business_type: Joi.string().valid(...BUSINESS_TYPE_CODES).required(),
  phone_number: Joi.string().pattern(phoneNumberPattern).required(),
  address: Joi.object({
    street: Joi.string().min(3).max(200).required(),
    city: Joi.string().valid(...Object.values(BRANCH_SETTINGS.SUPPORTED_CITIES).flat()).required(),
    country: Joi.string().valid(...Object.keys(BRANCH_SETTINGS.SUPPORTED_CITIES)).required(),
    postal_code: Joi.string().min(3).max(20).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  currency: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_CURRENCIES).default(BRANCH_SETTINGS.DEFAULT_CURRENCY),
  time_zone: Joi.string().default(BRANCH_SETTINGS.DEFAULT_TIMEZONE),
  preferred_language: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_LANGUAGES).default(BRANCH_SETTINGS.DEFAULT_LANGUAGE),
}).required();

const validateUpdateBusinessDetails = Joi.object({
  business_name: Joi.string().min(3).max(100),
  business_type: Joi.string().valid(...BUSINESS_TYPE_CODES),
  phone_number: Joi.string().pattern(phoneNumberPattern),
  address: Joi.object({
    street: Joi.string().min(3).max(200),
    city: Joi.string().valid(...Object.values(BRANCH_SETTINGS.SUPPORTED_CITIES).flat()),
    country: Joi.string().valid(...Object.keys(BRANCH_SETTINGS.SUPPORTED_CITIES)),
    postal_code: Joi.string().min(3).max(20),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
  preferred_language: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_LANGUAGES),
}).min(1);

const validateCountry = Joi.string()
  .valid(...Object.keys(BRANCH_SETTINGS.SUPPORTED_CITIES))
  .required();

const validateBranchSettings = Joi.object({
  contact_phone: Joi.string().pattern(phoneNumberPattern).optional(),
  operating_hours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }).optional(),
  delivery_radius_km: Joi.number().min(1).max(MUNCH_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM).optional(),
}).min(1);

const validateMedia = Joi.object({
  type: Joi.string().valid('logo', 'banner').required(),
  file: Joi.object({
    mimetype: Joi.string().valid(...MUNCH_CONSTANTS.MENU_SETTINGS.ALLOWED_MEDIA_TYPES).required(),
    size: Joi.number().max(MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MEDIA_SIZE_MB * 1024 * 1024).required(),
  }).required(),
}).required();

const validateWalletSettings = Joi.object({
  paymentMethod: Joi.object({
    type: Joi.string().valid(...WALLET_CONSTANTS.PAYMENT_METHODS).required(),
    details: Joi.object().required(),
  }).optional(),
  withdrawal: Joi.object({
    amount: Joi.number().min(WALLET_CONSTANTS.PAYOUT_SETTINGS.MIN_PAYOUT_AMOUNT).required(),
    currency: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_CURRENCIES).required(),
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
  validateCreateMerchant: (req, res, next) => validateRequest(validateCreateMerchant, req.body, next),
  validateUpdateBusinessDetails: (req, res, next) => validateRequest(validateUpdateBusinessDetails, req.body, next),
  validateCountry: (req, res, next) => validateRequest(validateCountry, req.body.country, next),
  validateBranchSettings: (req, res, next) => validateRequest(validateBranchSettings, req.body, next),
  validateMedia: (req, res, next) => validateRequest(validateMedia, req.body, next),
  validateWalletSettings: (req, res, next) => validateRequest(validateWalletSettings, req.body, next),
};