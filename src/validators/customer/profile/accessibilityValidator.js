'use strict';

/**
 * Joi validators for customer accessibility routes.
 */

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');

module.exports = {
  validateEnableScreenReaders(req, res, next) {
    const schema = Joi.object({
      enabled: Joi.boolean().required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_input'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_INPUT')
      );
    }
    next();
  },

  validateAdjustFonts(req, res, next) {
    const schema = Joi.object({
      fontSize: Joi.string().valid('small', 'medium', 'large').required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_font_size'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_FONT_SIZE')
      );
    }
    next();
  },

  validateSupportMultiLanguage(req, res, next) {
    const schema = Joi.object({
      language: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
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
};