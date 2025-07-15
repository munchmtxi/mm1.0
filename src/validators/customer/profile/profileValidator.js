'use strict';

/**
 * Joi validators for customer profile routes.
 */

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');

module.exports = {
  validateUpdateProfile(req, res, next) {
    const schema = Joi.object({
      phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
      address: Joi.object({
        street: Joi.string().max(100).optional(),
        city: Joi.string().max(50).optional(),
        countryCode: Joi.string().length(2).optional(),
      }).optional(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_profile_data'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_PROFILE_DATA')
      );
    }
    next();
  },

  validateSetCountry(req, res, next) {
    const schema = Joi.object({
      country: Joi.string().length(2).required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_country'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_COUNTRY')
      );
    }
    next();
  },

  validateSetLanguage(req, res, next) {
    const schema = Joi.object({
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_language'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_LANGUAGE')
      );
    }
    next();
  },

  validateSetDietaryPreferences(req, res, next) {
    const schema = Joi.object({
      preferences: Joi.array().items(Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.DIETARY_PREFERENCES)).required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_dietary_preferences'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_DIETARY_PREFERENCES')
      );
    }
    next();
  },

  validateSetDefaultAddress(req, res, next) {
    const schema = Joi.object({
      addressId: Joi.string().uuid().required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_address_id'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_ADDRESS_ID')
      );
    }
    next();
  },
};