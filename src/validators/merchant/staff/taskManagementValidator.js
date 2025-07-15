// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\staff\taskManagementValidator.js
'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const allocateTaskValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('taskType').isString().notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Invalid task type'),
  body('description').isString().notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Task description required'),
  body('dueDate').isISO8601().withMessage(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Invalid due date'),
];

const trackTaskProgressValidation = [
  param('taskId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Invalid task ID'),
];

const notifyTaskDelaysValidation = [
  param('taskId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Invalid task ID'),
];

module.exports = {
  allocateTaskValidation,
  trackTaskProgressValidation,
  notifyTaskDelaysValidation,
};