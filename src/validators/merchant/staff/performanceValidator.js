// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\staff\performanceValidator.js
'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const monitorMetricsValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('metricType').isIn(staffConstants.STAFF_ANALYTICS_CONSTANTS.METRICS).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid metric type'),
  body('value').isNumeric().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid metric value'),
];

const generatePerformanceReportsValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('period').isIn(staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_PERIODS).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid period'),
  body('format').isIn(staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_FORMATS).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid format'),
];

const distributeTrainingValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('category').isIn(staffConstants.STAFF_TRAINING_CATEGORIES.map(c => c.id)).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_CERTIFICATION') ? 'INVALID_CERTIFICATION' : 'Invalid training category'),
  body('content').notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid content'),
];

module.exports = {
  monitorMetricsValidation,
  generatePerformanceReportsValidation,
  distributeTrainingValidation,
};