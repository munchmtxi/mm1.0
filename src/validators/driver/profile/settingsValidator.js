'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');
const authConstants = require('@constants/common/authConstants');

const setCountrySchema = Joi.object({
  country: Joi.string()
    .valid(...authConstants.AUTH_SETTINGS.SUPPORTED_COUNTRIES)
    .required(),
});

const setLanguageSchema = Joi.object({
  language: Joi.string()
    .valid(...driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES)
    .required(),
});

const configureAccessibilitySchema = Joi.object({
  screenReaderEnabled: Joi.boolean().required(),
  fontSize: Joi.number()
    .min(driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min)
    .max(driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max)
    .required(),
});

const updatePrivacySettingsSchema = Joi.object({
  location_visibility: Joi.string()
    .valid(...driverConstants.PROFILE_CONSTANTS.PRIVACY_SETTINGS.LOCATION_VISIBILITY)
    .optional(),
  data_sharing: Joi.string()
    .valid(...driverConstants.PROFILE_CONSTANTS.PRIVACY_SETTINGS.DATA_SHARING)
    .optional(),
  notifications: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    whatsapp: Joi.boolean().optional(),
  }).optional(),
});

module.exports = {
  setCountry: {
    body: setCountrySchema,
  },
  setLanguage: {
    body: setLanguageSchema,
  },
  configureAccessibility: {
    body: configureAccessibilitySchema,
  },
  updatePrivacySettings: {
    body: updatePrivacySettingsSchema,
  },
};