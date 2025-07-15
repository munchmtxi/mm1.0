// supportMiddleware.js
// Middleware for validating staff mtables support requests.

'use strict';

const { handleSupportRequestSchema, escalateIssueSchema, logSupportResolutionSchema } = require('@validators/staff/mtables/supportValidator');

async function validateHandleSupportRequest(req, res, next) {
  try {
    await handleSupportRequestSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateEscalateIssue(req, res, next) {
  try {
    await escalateIssueSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogSupportResolution(req, res, next) {
  try {
    await logSupportResolutionSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateHandleSupportRequest,
  validateEscalateIssue,
  validateLogSupportResolution,
};