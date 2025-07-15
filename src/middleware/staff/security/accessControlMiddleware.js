// accessControlMiddleware.js
// Middleware for validating staff security requests.

'use strict';

const { enforcePermissionsSchema, auditAccessSchema, updateAccessRulesSchema } = require('@validators/staff/security/accessControlValidator');

async function validateEnforcePermissions(req, res, next) {
  try {
    await enforcePermissionsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateAuditAccess(req, res, next) {
  try {
    await auditAccessSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateAccessRules(req, res, next) {
  try {
    await updateAccessRulesSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateEnforcePermissions,
  validateAuditAccess,
  validateUpdateAccessRules,
};