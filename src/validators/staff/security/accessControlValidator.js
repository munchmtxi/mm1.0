// accessControlValidator.js
// Validation schemas for staff security endpoints.

'use strict';

const Joi = require('joi');

const enforcePermissionsSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  requiredPermission: Joi.string().required(),
});

const auditAccessSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

const updateAccessRulesSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  permissions: Joi.array().items(Joi.string()).min(1).required(),
});

module.exports = {
  enforcePermissionsSchema,
  auditAccessSchema,
  updateAccessRulesSchema,
};