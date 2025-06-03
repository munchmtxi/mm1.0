'use strict';

/**
 * Branch Profile Validator
 * Validates input data for admin branch profile operations, ensuring compliance with
 * merchant and admin constants, including localization and business rules.
 */

const Joi = require('joi');
const { BRANCH_SETTINGS } = require('@constants/merchant/merchantConstants');
const { USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const phoneNumberPattern = /^\+\d{1,3}\d{9,15}$/;
const operatingHoursSchema = Joi.object({
  days: Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).required(),
  open: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  close: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
}).required();

const validateCreateBranch = Joi.object({
  merchant_id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(100).required(),
  address: Joi.object({
    street: Joi.string().min(3).max(200).required(),
    city: Joi.string().valid(...Object.values(BRANCH_SETTINGS.SUPPORTED_CITIES).flat()).required(),
    country: Joi.string().valid(...Object.keys(BRANCH_SETTINGS.SUPPORTED_CITIES)).required(),
    postal_code: Joi.string().min(3).max(20).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  contact_phone: Joi.string().pattern(phoneNumberPattern).required(),
  preferred_language: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_LANGUAGES).default(BRANCH_SETTINGS.DEFAULT_LANGUAGE),
}).required();

const validateUpdateBranchDetails = Joi.object({
  name: Joi.string().min(3).max(100),
  address: Joi.object({
    street: Joi.string().min(3).max(200),
    city: Joi.string().valid(...Object.values(BRANCH_SETTINGS.SUPPORTED_CITIES).flat()),
    country: Joi.string().valid(...Object.keys(BRANCH_SETTINGS.SUPPORTED_CITIES)),
    postal_code: Joi.string().min(3).max(20),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
  contact_phone: Joi.string().pattern(phoneNumberPattern),
  preferred_language: Joi.string().valid(...BRANCH_SETTINGS.SUPPORTED_LANGUAGES),
}).min(1);

const validateGeofence = Joi.object({
  center: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  radius_km: Joi.number().min(1).max(BRANCH_SETTINGS.MUNCH_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM).required(),
}).required();

const validateOperatingHours = Joi.array().items(operatingHoursSchema).min(1).required();

const validateMedia = Joi.object({
  type: Joi.string().valid('storefront').required(),
  file: Joi.object({
    mimetype: Joi.string().valid(...BRANCH_SETTINGS.MUNCH_CONSTANTS.MENU_SETTINGS.ALLOWED_MEDIA_TYPES).required(),
    size: Joi.number().max(BRANCH_SETTINGS.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MEDIA_SIZE_MB * 1024 * 1024).required(),
  }).required(),
}).required();

const validateRequest = (schema, data, next) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed', { details: error.details });
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.details));
  }
  next();
};

module.exports = {
  validateCreateBranch: (req, res, next) => validateRequest(validateCreateBranch, req.body, next),
  validateUpdateBranchDetails: (req, res, next) => validateRequest(validateUpdateBranchDetails, req.body, next),
  validateGeofence: (req, res, next) => validateRequest(validateGeofence, req.body, next),
  validateOperatingHours: (req, res, next) => validateRequest(validateOperatingHours, req.body, next),
  validateMedia: (req, res, next) => validateRequest(validateMedia, req.body, next),
};