// performanceValidator.js
// Validation schemas for staff performance analytics endpoints.

'use strict';

const Joi = require('joi');

const trackPerformanceMetricsSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

const generatePerformanceReportSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

const evaluateTrainingImpactSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  trackPerformanceMetricsSchema,
  generatePerformanceReportSchema,
  evaluateTrainingImpactSchema,
};