// supportValidator.js
// Validation schemas for staff mtables support endpoints.

'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');

const issueSchema = Joi.object({
  description: Joi.string().min(10).max(500).required(),
  issue_type: Joi.string().valid(...mtablesConstants.SUPPORT_ISSUE_TYPES).required(),
});

const handleSupportRequestSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  issue: issueSchema.required(),
  staffId: Joi.number().integer().positive().required(),
});

const escalateIssueSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const logSupportResolutionSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  resolutionDetails: Joi.string().min(10).max(500).required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  handleSupportRequestSchema,
  escalateIssueSchema,
  logSupportResolutionSchema,
};