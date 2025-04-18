'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const adminConstants = require('@constants/admin/adminConstants');
const catchAsync = require('@utils/catchAsync');

const validateUpdatePersonalInfo = (req, res, next) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    country: Joi.string()
      .valid(...adminConstants.ALLOWED_COUNTRIES)
      .optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400, 'INVALID_INPUT');
  }
  next();
};

const validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .max(100)
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[0-9]/, 'digits')
      .pattern(/[^A-Za-z0-9]/, 'symbols')
      .required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400, 'INVALID_INPUT');
  }
  next();
};

const validateUploadPicture = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, adminConstants.ERROR_CODES.NO_FILE_UPLOADED);
  }
  const schema = Joi.object({
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').required(),
    size: Joi.number().max(5 * 1024 * 1024).required(),
  });
  const { error } = schema.validate({ mimetype: req.file.mimetype, size: req.file.size });
  if (error) {
    throw new AppError(error.details[0].message, 400, 'INVALID_FILE');
  }
  next();
});

const validateAvailabilityStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(adminConstants.AVAILABILITY_STATUSES))
      .required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400, 'INVALID_INPUT');
  }
  next();
};

module.exports = {
  validateUpdatePersonalInfo,
  validateChangePassword,
  validateUploadPicture,
  validateAvailabilityStatus,
};