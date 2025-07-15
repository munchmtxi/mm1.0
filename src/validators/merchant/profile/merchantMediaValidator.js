'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const uploadMenuPhotosSchema = Joi.object({});

const managePromotionalMediaSchema = Joi.object({
  type: Joi.string()
    .valid(...merchantConstants.MUNCH_CONSTANTS.MENU_SETTINGS.PROMOTION_MEDIA_TYPES)
    .required(),
});

const updateMediaMetadataSchema = Joi.object({
  title: Joi.string()
    .max(merchantConstants.MEDIA_CONSTANTS.MAX_TITLE_LENGTH)
    .optional(),
  description: Joi.string()
    .max(merchantConstants.MEDIA_CONSTANTS.MAX_DESCRIPTION_LENGTH)
    .optional(),
});

const deleteMediaSchema = Joi.object({});

const validateUploadMenuPhotos = (req, res, next) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidFileData'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateManagePromotionalMedia = (req, res, next) => {
  const { error } = managePromotionalMediaSchema.validate({ type: req.body.type });
  if (error || !req.file) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidFileData'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateUpdateMediaMetadata = (req, res, next) => {
  const { error } = updateMediaMetadataSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.invalidMetadata'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

const validateDeleteMedia = (req, res, next) => {
  const { error } = deleteMediaSchema.validate(req.body);
  if (error) {
    throw new AppError(
      formatMessage('merchant', 'profile', 'en', 'errors.mediaNotFound'),
      400,
      merchantConstants.ERROR_CODES[5]
    );
  }
  next();
};

module.exports = {
  validateUploadMenuPhotos,
  validateManagePromotionalMedia,
  validateUpdateMediaMetadata,
  validateDeleteMedia,
};