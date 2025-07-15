// roleManagementMiddleware.js
// Middleware for validating staff management requests.

'use strict';

const { assignRoleSchema, updateRolePermissionsSchema, getRoleDetailsSchema } = require('@validators/staff/staffManagement/roleManagementValidator');

async function validateAssignRole(req, res, next) {
  try {
    await assignRoleSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateRolePermissions(req, res, next) {
  try {
    await updateRolePermissionsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGetRoleDetails(req, res, next) {
  try {
    await getRoleDetailsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateAssignRole,
  validateUpdateRolePermissions,
  validateGetRoleDetails,
};