'use strict';

/**
 * Driver Profile Validator
 * Validates incoming data for driver profile operations using Joi. Ensures compliance with
 * driverConstants.js for allowed values and formats.
 *
 * Last Updated: May 15, 2025
 */

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Validation schema for updating driver profile.
 */
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  vehicleType: Joi.string()
    .valid(...Object.values(driverConstants.PROFILE_CONSTANTS.VEHICLE_TYPES))
    .optional(),
}).min(1);

/**
 * Validation schema for uploading certifications.
 */
const uploadCertificationSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(driverConstants.PROFILE_CONSTANTS.CERTIFICATIONS))
    .required(),
});

/**
 * Validates update profile request body.
 * @param {Object} data - Request body.
 */
const validateUpdateProfile = (data) => {
  const { error } = updateProfileSchema.validate(data);
  if (error) {
    logger.warn('Update profile validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }
};

/**
 * Validates certification upload request body.
 * @param {Object} data - Request body.
 */
const validateUploadCertification = (data) => {
  const { error } = uploadCertificationSchema.validate(data);
  if (error) {
    logger.warn('Upload certification validation failed', { error: error.details });
    throw new AppError(
      error.details[0].message,
      400,
      driverConstants.ERROR_CODES.INVALID_CERTIFICATION_TYPE
    );
  }
};

module.exports = {
  validateUpdateProfile,
  validateUploadCertification,
};