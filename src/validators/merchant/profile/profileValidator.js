'use strict';

/**
 * Merchant Profile Validator
 * Defines validation schemas for merchant profile operations using Joi. Ensures input data
 * complies with merchantConstants and service requirements.
 *
 * Last Updated: May 16, 2025
 */

const Joi = require('joi');
const merchantConstants = require('@constants/merchantConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Validation schema for updating business details.
 */
const updateBusinessDetailsSchema = Joi.object({
  businessName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  businessHours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  }).optional(),
  businessType: Joi.string().valid(...merchantConstants.MERCHANT_TYPES).optional(),
  businessTypeDetails: Joi.any().optional(), // Service validates this
}).min(1);

/**
 * Validation schema for country settings.
 */
const countrySettingsSchema = Joi.object({
  country: Joi.string()
    .valid(...Object.keys(merchantConstants.BRANCH_SETTINGS.SUPPORTED_CITIES)) // Use SUPPORTED_COUNTRIES
    .required(),
});

/**
 * Validation schema for localization settings.
 */
const localizationSettingsSchema = Joi.object({
  language: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_LANGUAGES)
    .optional(),
}).min(1);

/**
 * Validation schema for menu photos.
 */
const menuPhotosSchema = Joi.array()
  .items(
    Joi.object({
      originalname: Joi.string().required(),
      mimetype: Joi.string()
        .valid(...merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.ALLOWED_MEDIA_TYPES)
        .required(),
      size: Joi.number()
        .max(merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MEDIA_SIZE_MB * 1024 * 1024)
        .required(),
    })
  )
  .min(1);

/**
 * Validation schema for promotional media.
 */
const promotionalMediaSchema = Joi.object({
  type: Joi.string().valid('banner', 'promo_video').required(),
});

/**
 * Validation schema for media metadata.
 */
const mediaMetadataSchema = Joi.object({
  title: Joi.string()
    .max(merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MEDIA_SIZE_MB * 20) // Adjusted for reasonable title length
    .optional(),
  description: Joi.string()
    .max(merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.MAX_MEDIA_SIZE_MB * 100) // Adjusted for description
    .optional(),
}).min(1);

/**
 * Validation schema for branch details.
 */
const branchDetailsSchema = Joi.object({
  operatingHours: Joi.array()
    .items(
      Joi.object({
        day: Joi.string()
          .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
          .required(),
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      })
    )
    .optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    address: Joi.string().min(5).max(200).optional(),
  }).optional(),
  contactPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
}).min(1);

/**
 * Validation schema for branch settings.
 */
const branchSettingsSchema = Joi.object({
  currency: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_CURRENCIES)
    .optional(),
  language: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_LANGUAGES)
    .optional(),
}).min(1);

/**
 * Validation schema for branch media.
 */
const branchMediaSchema = Joi.object({
  type: Joi.string()
    .valid('menu_photos', 'promotional_media', 'branch_media', 'banner', 'promo_video')
    .required(),
});

/**
 * Validates request body for updating business details.
 */
const validateUpdateBusinessDetails = (req, res, next) => {
  const { error } = updateBusinessDetailsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for update business details', { errors: error.details });
    return next(new AppError(
      'Invalid input data',
      400,
      merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for country settings.
 */
const validateCountrySettings = (req, res, next) => {
  const { error } = countrySettingsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for country settings', { errors: error.details });
    return next(new AppError(
      'Invalid country data',
      400,
      merchantConstants.ERROR_CODES.UNSUPPORTED_COUNTRY,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for localization settings.
 */
const validateLocalizationSettings = (req, res, next) => {
  const { error } = localizationSettingsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for localization settings', { errors: error.details });
    return next(new AppError(
      'Invalid localization data',
      400,
      merchantConstants.ERROR_CODES.INVALID_LANGUAGE,
      error.details
    ));
  }
  next();
};

/**
 * Validates request files for menu photos.
 */
const validateMenuPhotos = (req, res, next) => {
  const { error } = menuPhotosSchema.validate(req.files, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for menu photos', { errors: error.details });
    return next(new AppError(
      'Invalid photo data',
      400,
      merchantConstants.ERROR_CODES.INVALID_FILE_DATA,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for promotional media.
 */
const validatePromotionalMedia = (req, res, next) => {
  const { error } = promotionalMediaSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for promotional media', { errors: error.details });
    return next(new AppError(
      'Invalid promotional media data',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_TYPE,
      error.details
    ));
  }
  if (!req.file) {
    logger.warn('Missing file for promotional media');
    return next(new AppError(
      'Missing media file',
      400,
      merchantConstants.ERROR_CODES.INVALID_FILE_DATA
    ));
  }
  next();
};

/**
 * Validates request body for media metadata.
 */
const validateMediaMetadata = (req, res, next) => {
  const { error } = mediaMetadataSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for media metadata', { errors: error.details });
    return next(new AppError(
      'Invalid metadata data',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_METADATA,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for branch details.
 */
const validateBranchDetails = (req, res, next) => {
  const { error } = branchDetailsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for branch details', { errors: error.details });
    return next(new AppError(
      'Invalid branch details',
      400,
      merchantConstants.ERROR_CODES.INVALID_OPERATING_HOURS,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for branch settings.
 */
const validateBranchSettings = (reqケアエクスプレス, res, next) => {
  const { error } = branchSettingsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for branch settings', { errors: error.details });
    return next(new AppError(
      'Invalid branch settings',
      400,
      merchantConstants.ERROR_CODES.INVALID_CURRENCY,
      error.details
    ));
  }
  next();
};

/**
 * Validates request body for branch media.
 */
const validateBranchMedia = (req, res, next) => {
  const { error } = branchMediaSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for branch media', { errors: error.details });
    return next(new AppError(
      'Invalid branch media data',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_TYPE,
      error.details
    ));
  }
  if (!req.file) {
    logger.warn('Missing file for branch media');
    return next(new AppError(
      'Missing media file',
      400,
      merchantConstants.ERROR_CODES.INVALID_FILE_DATA
    ));
  }
  next();
};

module.exports = {
  validateUpdateBusinessDetails,
  validateCountrySettings,
  validateLocalizationSettings,
  validateMenuPhotos,
  validatePromotionalMedia,
  validateMediaMetadata,
  validateBranchDetails,
  validateBranchSettings,
  validateBranchMedia,
};