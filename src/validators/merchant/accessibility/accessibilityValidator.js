'use strict';

const Joi = require('joi');
const localizationConstants = require('@constants/common/localizationConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');

/**
 * Validates accessibility-related request data.
 */
const accessibilityValidator = {
  /**
   * Validates enableScreenReaders request.
   */
  enableScreenReaders: Joi.object({
    merchantId: Joi.string().uuid().required(),
  }),

  /**
   * Validates adjustFonts request.
   */
  adjustFonts: Joi.object({
    merchantId: Joi.string().uuid().required(),
    fontSize: Joi.number()
      .min(merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min)
      .max(merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max)
      .required(),
  }),

  /**
   * Validates supportMultiLanguage request.
   */
  supportMultiLanguage: Joi.object({
    merchantId: Joi.string().uuid().required(),
    language: Joi.string()
      .valid(...localizationConstants.SUPPORTED_LANGUAGES)
      .required(),
  }),
};

module.exports = accessibilityValidator;