'use strict';

const { body, param } = require('express-validator');

const recordClockInOutValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('action')
    .isIn(['clock_in', 'clock_out']).withMessage('Action must be either clock_in or clock_out')
];

const calculateShiftDurationValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const generateTimeReportValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

module.exports = {
  recordClockInOutValidation,
  calculateShiftDurationValidation,
  generateTimeReportValidation
};