// bookingValidator.js
// Validation schemas for staff mtables endpoints.

'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');

const getActiveBookingsSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const updateBookingStatusSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(...Object.values(mtablesConstants.BOOKING_STATUSES)).required(),
  staffId: Joi.number().integer().positive().required(),
});

const manageWaitlistSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  customerId: Joi.number().integer().positive().required(),
  action: Joi.string().valid('add', 'remove').required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  getActiveBookingsSchema,
  updateBookingStatusSchema,
  manageWaitlistSchema,
};