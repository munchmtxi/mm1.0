// checkInValidator.js
// Validation schemas for staff mtables check-in endpoints.

'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');

const processCheckInSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const logCheckInTimeSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

const updateTableStatusSchema = Joi.object({
  tableId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(...mtablesConstants.TABLE_STATUSES).required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  processCheckInSchema,
  logCheckInTimeSchema,
  updateTableStatusSchema,
};