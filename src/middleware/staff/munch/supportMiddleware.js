// supportMiddleware.js
// Middleware for validating staff munch support requests.

'use strict';

const { handleOrderInquirySchema, resolveOrderIssueSchema, escalateOrderDisputeSchema } = require('@validators/staff/munch/supportValidator');

async function validateHandleOrderInquiry(req, res, next) {
  try {
    await handleOrderInquirySchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateResolveOrderIssue(req, res, next) {
  try {
    await resolveOrderIssueSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateEscalateOrderDispute(req, res, next) {
  try {
    await escalateOrderDisputeSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateHandleOrderInquiry,
  validateResolveOrderIssue,
  validateEscalateOrderDispute,
};