'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const createShiftValidation = [
  body('restaurantId')
    .isInt({ min: 1 }).withMessage('Restaurant ID must be a positive integer'),
  body('schedule.staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('schedule.startTime')
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
  body('schedule.endTime')
    .isISO8601().withMessage('End time must be a valid ISO 8601 date')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.schedule.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('schedule.shiftType')
    .isIn(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES)
    .withMessage(`Shift type must be one of: ${staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.join(', ')}`)
];

const updateShiftValidation = [
  param('scheduleId')
    .isInt({ min: 1 }).withMessage('Schedule ID must be a positive integer'),
  body('startTime')
    .optional()
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
  body('endTime')
    .optional()
    .isISO8601().withMessage('End time must be a valid ISO 8601 date')
    .custom((endTime, { req }) => {
      if (endTime && req.body.startTime && new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('shiftType')
    .optional()
    .isIn(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES)
    .withMessage(`Shift type must be one of: ${staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES.join(', ')}`)
];

const notifyShiftChangeValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

module.exports = {
  createShiftValidation,
  updateShiftValidation,
  notifyShiftChangeValidation
};