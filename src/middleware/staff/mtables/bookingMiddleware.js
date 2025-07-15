// bookingMiddleware.js
// Middleware for validating staff mtables requests.

'use strict';

const { getActiveBookingsSchema, updateBookingStatusSchema, manageWaitlistSchema } = require('@validators/staff/mtables/bookingValidator');

async function validateGetActiveBookings(req, res, next) {
  try {
    await getActiveBookingsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateBookingStatus(req, res, next) {
  try {
    await updateBookingStatusSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateManageWaitlist(req, res, next) {
  try {
    await manageWaitlistSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateGetActiveBookings,
  validateUpdateBookingStatus,
  validateManageWaitlist,
};