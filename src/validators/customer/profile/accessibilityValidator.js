'use strict';

const Joi = require('joi');
const customerConstants = require('@constants/customer/customerConstants');

const enableScreenReaderSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

const adjustFontSizeSchema = Joi.object({
  fontSize: Joi.number()
    .min(customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min)
    .max(customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max)
    .required(),
});

const supportMultiLanguageSchema = Joi.object({
  language: Joi.string()
    .valid(...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES)
    .required(),
});

module.exports = { enableScreenReaderSchema, adjustFontSizeSchema, supportMultiLanguageSchema };