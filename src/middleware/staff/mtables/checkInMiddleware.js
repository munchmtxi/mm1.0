// checkInMiddleware.js
// Middleware for validating staff mtables check-in requests.

'use strict';

const { processCheckInSchema, logCheckInTimeSchema, updateTableStatusSchema } = require('@validators/staff/mtables/checkInValidator');

async function validateProcessCheckIn(req, res, next) {
  try {
    await processCheckInSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogCheckInTime(req, res, next) {
  try {
    await logCheckInTimeSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateTableStatus(req, res, next) {
  try {
    await updateTableStatusSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateProcessCheckIn,
  validateLogCheckInTime,
  validateUpdateTableStatus,
};