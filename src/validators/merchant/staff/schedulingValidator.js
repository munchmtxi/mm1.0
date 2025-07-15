// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\staff\schedulingValidator.js
'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const createScheduleValidation = [
  param('restaurantId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch ID'),
  body('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('startTime').isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid start time'),
  body('endTime').isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid end time'),
  body('shiftType').isIn(Object.values(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES || {})).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift type'),
];

const trackTimeValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('shiftId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift ID'),
  body('clockIn').optional().isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid clock-in time'),
  body('clockOut').optional().isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid clock-out time'),
];

const notifyScheduleValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  param('shiftId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift ID'),
];

const adjustScheduleValidation = [
  param('scheduleId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift ID'),
  body('startTime').optional().isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid start time'),
  body('endTime').optional().isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid end time'),
  body('shiftType').optional().isIn(Object.values(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES || {})).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift type'),
  body('status').optional().isIn(['scheduled', 'active', 'completed', 'cancelled']).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift status'),
];

module.exports = {
  createScheduleValidation,
  trackTimeValidation,
  notifyScheduleValidation,
  adjustScheduleValidation,
};