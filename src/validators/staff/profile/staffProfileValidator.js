// staffProfileValidator.js
// Validation schemas for staff profile endpoints.

'use strict';

const Joi = require('joi');
const staffConstants = require('@constants/staff/staffConstants');

const createStaffProfileSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  details: Joi.object({
    merchantId: Joi.number().integer().positive().required(),
    position: Joi.string().valid(...staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES).required(),
    branchId: Joi.number().integer().positive().optional(),
    certifications: Joi.array().items(Joi.string().valid(...staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS)).optional(),
    geofenceId: Joi.number().integer().positive().optional(),
    bankDetails: Joi.object({
      accountNumber: Joi.string().required(),
      routingNumber: Joi.string().required(),
      bankName: Joi.string().required(),
      method: Joi.string().valid(...Object.values(staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS)).optional(),
    }).optional(),
  }).required(),
});

const updateStaffDetailsSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  details: Joi.object({
    userUpdates: Joi.object({
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
      preferred_language: Joi.string().valid(...staffConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES).optional(),
      country: Joi.string().valid(...Object.keys(staffConstants.STAFF_SETTINGS.SUPPORTED_CITIES)).optional(),
    }).optional(),
    staffUpdates: Joi.object({
      position: Joi.string().valid(...staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES).optional(),
      branch_id: Joi.number().integer().positive().optional(),
      geofence_id: Joi.number().integer().positive().optional(),
      certifications: Joi.array().items(Joi.string().valid(...staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS)).optional(),
      assigned_area: Joi.string().optional(),
      availability_status: Joi.string().valid(...Object.values(staffConstants.STAFF_STATUSES)).optional(),
    }).optional(),
    bankDetails: Joi.object({
      accountNumber: Joi.string().required(),
      routingNumber: Joi.string().required(),
      bankName: Joi.string().required(),
      method: Joi.string().valid(...Object.values(staffConstants.STAFF_WALLET_CONSTANTS.PAYMENT_METHODS)).optional(),
    }).optional(),
  }).required(),
});

const verifyComplianceSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

const getStaffProfileSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  createStaffProfileSchema,
  updateStaffDetailsSchema,
  verifyComplianceSchema,
  getStaffProfileSchema,
};