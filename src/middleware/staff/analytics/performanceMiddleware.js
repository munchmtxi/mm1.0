// performanceMiddleware.js
// Middleware for validating staff performance analytics requests.

'use strict';

const { trackPerformanceMetricsSchema, generatePerformanceReportSchema, evaluateTrainingImpactSchema } = require('@validators/staff/analytics/performanceValidator');

async function validateTrackPerformanceMetrics(req, res, next) {
  try {
    await trackPerformanceMetricsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGeneratePerformanceReport(req, res, next) {
  try {
    await generatePerformanceReportSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateEvaluateTrainingImpact(req, res, next) {
  try {
    await evaluateTrainingImpactSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateTrackPerformanceMetrics,
  validateGeneratePerformanceReport,
  validateEvaluateTrainingImpact,
};