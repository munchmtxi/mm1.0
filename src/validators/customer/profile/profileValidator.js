'use strict';

/**
 * Customer Profile Validator
 * Validates incoming data for customer profile operations using Joi. Ensures compliance with
 * customerConstants.js for allowed values and formats.
 *
 * Last Updated: May 15, 2025
 */

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Validation schema for updating customer profile.
 */
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
}).min(1);

/**
 * Validation schema for setting customer country.
 */
const setCountrySchema = Joi.object({
  countryCode: Joi.string()
    .valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_COUNTRIES)
    .required(),
});

/**
 * Validation schema for setting customer language.
 */
const setLanguageSchema = Joi.object({
  languageCode: Joi.string()
     .valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES)
    .required(),
});

/**
 * Validation schema for setting dietary preferences.
 */
const setDietaryPreferencesSchema = Joi.object({
  preferences: Joi.array()
    .items(Joi.string().valid(...customerConstants.ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS))
    .required(),
});

/**
 * Validates update profile request body.
 * @param {Object} data - Request body.
 */
const validateUpdateProfile = (data) => {
  const { error } = updateProfileSchema.validate(data);
  if (error) {
    logger.warn('Update profile validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }
};

/**
 * Validates set country request body.
 * @param {Object} data - Request body.
 */
const validateSetCountry = (data) => {
  const { error } = setCountrySchema.validate(data);
  if (error) {
    logger.warn('Set country validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      customerConstants.ERROR_CODES.UNSUPPORTED_COUNTRY
    );
  }
};

/**
 * Validates set language request body.
 * @param {Object} data - Request body.
 */
const validateSetLanguage = (data) => {
  const { error } = setLanguageSchema.validate(data);
  if (error) {
    logger.warn('Set language validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      customerConstants.ERROR_CODES.INVALID_LANGUAGE
    );
  }
};

/**
 * Validates set dietary preferences request body.
 * @param {Object} data - Request body.
 */
const validateSetDietaryPreferences = (data) => {
  const { error } = setDietaryPreferencesSchema.validate(data);
  if (error) {
    logger.warn('Set dietary preferences validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER
    );
  }
};

module.exports = {
  validateUpdateProfile,
  validateSetCountry,
  validateSetLanguage,
  validateSetDietaryPreferences,
};