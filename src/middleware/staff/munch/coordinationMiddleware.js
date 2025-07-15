// coordinationMiddleware.js
// Middleware for validating staff munch coordination requests.

'use strict';

const { coordinateDriverPickupSchema, verifyDriverCredentialsSchema, logPickupTimeSchema } = require('@validators/staff/munch/coordinationValidator');

async function validateCoordinateDriverPickup(req, res, next) {
  try {
    await coordinateDriverPickupSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateVerifyDriverCredentials(req, res, next) {
  try {
    await verifyDriverCredentialsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogPickupTime(req, res, next) {
  try {
    await logPickupTimeSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateCoordinateDriverPickup,
  validateVerifyDriverCredentials,
  validateLogPickupTime,
};