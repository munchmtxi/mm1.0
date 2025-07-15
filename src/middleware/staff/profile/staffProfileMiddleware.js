// staffProfileMiddleware.js
// Middleware for validating staff profile requests.

'use strict';

const { createStaffProfileSchema, updateStaffDetailsSchema, verifyComplianceSchema, getStaffProfileSchema } = require('@validators/staff/profile/staffProfileValidator');

async function validateCreateStaffProfile(req, res, next) {
  try {
    await createStaffProfileSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateStaffDetails(req, res, next) {
  try {
    await updateStaffDetailsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateVerifyCompliance(req, res, next) {
  try {
    await verifyComplianceSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGetStaffProfile(req, res, next) {
  try {
    await getStaffProfileSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateCreateStaffProfile,
  validateUpdateStaffDetails,
  validateVerifyCompliance,
  validateGetStaffProfile,
};