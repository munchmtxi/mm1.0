'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const updateBranchDetailsSchema = Joi.object({
  operatingHours: Joi.object({
    open: Joi.string().required(),
    close: Joi.string().required(),
  }).optional(),
  location: Joi.object({
    countryCode: Joi.string().required(),
    city: Joi.string().required(),
  }).optional(),
  contactPhone: Joi.string().optional(),
});

const configureBranchSettingsSchema = Joi.object({
  currency: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_CURRENCIES)
    .optional(),
  language: Joi.string()
    .valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_LANGUAGES)
    .optional(),
});

const manageBranchMediaSchema = Joi.object({
  type: Joi.string()
    .valid(...merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.ALLOWED_MEDIA_TYPES)
    .required(),
});

const syncBranchProfilesSchema = Joi.object({});

const validateUpdateBranchDetails = (req, res, next) => {
  const { error } = updateBranchDetailsSchema.validate(req.body);
  if (error)
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidOperatingHours'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  next();
};

const validateConfigureBranchSettings = (req, res, next) => {
  const { error } = configureBranchSettingsSchema.validate(req.body);
  if (error)
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidCurrency'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  next();
};

const validateManageBranchMedia = (req, res, next) => {
  const { error } = manageBranchMediaSchema.validate({ type: req.body.type });
  if (error || !req.file)
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidFileData'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  next();
};

const validateSyncBranchProfiles = (req, res, next) => {
  const { error } = syncBranchProfilesSchema.validate(req.body);
  if (error)
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.merchantNotFound'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  next();
};

module.exports = {
  validateUpdateBranchDetails,
  validateConfigureBranchSettings,
  validateManageBranchMedia,
  validateSyncBranchProfiles,
};