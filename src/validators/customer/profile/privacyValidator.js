'use strict';

const Joi = require('joi');

const setPrivacySettingsSchema = Joi.object({
  anonymizeLocation: Joi.boolean().optional(),
  anonymizeProfile: Joi.boolean().optional(),
}).min(1);

const manageDataAccessSchema = Joi.object({
  shareWithMerchants: Joi.boolean().optional(),
  shareWithThirdParties: Joi.boolean().optional(),
}).min(1);

module.exports = { setPrivacySettingsSchema, manageDataAccessSchema };