'use strict';

/**
 * Joi validators for customer privacy routes.
 */

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');

module.exports = {
  validateSetPrivacySettings(req, res, next) {
    const schema = Joi.object({
      location_visibility: Joi.string().valid('public', 'private', 'contacts').required(),
      data_sharing: Joi.boolean().required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_privacy_settings'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_PRIVACY_SETTINGS')
      );
    }
    next();
  },

  validateManageDataAccess(req, res, next) {
    const schema = Joi.object({
      permissions: Joi.object().pattern(Joi.string(), Joi.boolean()).required(),
      languageCode: Joi.string().valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(
        formatMessage('customer', 'profile', req.languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'profile.invalid_permissions'),
        400,
        customerConstants.ERROR_CODES.find(code => code === 'INVALID_PERMISSIONS')
      );
    }
    next();
  },
};