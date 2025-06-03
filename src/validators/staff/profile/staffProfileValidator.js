'use strict';

/**
 * Staff Profile Validator
 * Validates input data for staff profile operations using Joi.
 * Ensures alignment with staffProfileService expectations.
 *
 * Last Updated: May 16, 2025
 */

const Joi = require('joi');
const { STAFF_TYPES, STAFF_PROFILE_CONSTANTS } = require('@constants/staff/staffRolesConstants');
const { STAFF_COMPLIANCE_CONSTANTS, STAFF_ERROR_CODES, STAFF_SETTINGS, STAFF_STATUSES } = require('@constants/staff/staffSystemConstants');
const { STAFF_WALLET_CONSTANTS } = require('@constants/staff/staffSystemConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const updateStaffDetailsSchema = Joi.object({
  userUpdates: Joi.object({
    first_name: Joi.string().min(2).max(100).optional(),
    last_name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    preferred_language: Joi.string().valid(...STAFF_SETTINGS.SUPPORTED_LANGUAGES).optional(),
    country: Joi.string().valid(...Object.keys(STAFF_SETTINGS.SUPPORTED_CITIES)).optional(),
  }).optional(),
  staffUpdates: Joi.object({
    position: Joi.string().valid(...STAFF_TYPES).optional(),
    branch_id: Joi.number().integer().optional(),
    geofence_id: Joi.number().integer().optional(),
    certifications: Joi.array()
      .items(Joi.string().valid(...STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS))
      .optional(),
    assigned_area: Joi.string().optional(),
    availability_status: Joi.string().valid(...Object.values(STAFF_STATUSES)).optional(),
  }).optional(),
  bankDetails: Joi.object({
    accountNumber: Joi.string().min(8).max(20).required(),
    routingNumber: Joi.string().min(9).max(9).required(),
    bankName: Joi.string().min(2).max(100).required(),
    method: Joi.string().valid(...Object.values(STAFF_WALLET_CONSTANTS.PAYMENT_METHODS)).optional(),
  }).optional(),
}).min(1);

const validateUpdateStaffDetails = (req, res, next) => {
  const { error } = updateStaffDetailsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn('Validation failed for update staff details', { errors: error.details });
    return next(new AppError(
      'Invalid input data',
      400,
      STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
      error.details
    ));
  }
  next();
};

module.exports = {
  validateUpdateStaffDetails,
};