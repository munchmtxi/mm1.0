// roleManagementValidator.js
// Validation schemas for staff management endpoints.

'use strict';

const Joi = require('joi');
const staffConstants = require('@constants/staff/staffConstants');

const assignRoleSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  role: Joi.string().valid(...staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES).required(),
});

const updateRolePermissionsSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  permissions: Joi.array().items(Joi.string()).min(1).required(),
});

const getRoleDetailsSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  assignRoleSchema,
  updateRolePermissionsSchema,
  getRoleDetailsSchema,
};