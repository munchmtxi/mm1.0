'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const updateBusinessDetailsSchema = Joi.object({
  businessName: Joi.string().optional(),
  phone: Joi.string().optional(),
  businessHours: Joi.object({
    open: Joi.string().required(),
    close: Joi.string().required(),
  }).optional(),
  businessType: Joi.string()
    .valid(...merchantConstants.MERCHANT_SETTINGS.BUSINESS_TYPES)
    .optional(),
  businessTypeDetails: Joi.object().optional(),
});

const setCountrySettingsSchema = Joi.object({
  country: Joi.string()
    .valid(...merchantConstants.MERCHANT_SETTINGS.SUPPORTED_COUNTRIES)
    .required(),
});

const manageLocalizationSchema = Joi.object({
  language: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_LANGUAGES)
    .required(),
});

const validateUpdateBusinessDetails = (req, res, next) => {
  const { error } = updateBusinessDetailsSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidOperatingHours'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateSetCountrySettings = (req, res, next) => {
  const { error } = setCountrySettingsSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.unsupportedCountry'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateManageLocalization = (req, res, next) => {
  const { error } = manageLocalizationSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidLanguage'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

module.exports = {
  validateUpdateBusinessDetails,
  validateSetCountrySettings,
  validateManageLocalization,
};