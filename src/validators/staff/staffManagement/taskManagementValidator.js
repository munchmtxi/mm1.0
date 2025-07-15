'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const assignTaskValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('task.taskType')
    .isString().withMessage('Task type must be a string')
    .custom((taskType, { req }) => {
      const staffRole = req.body.staffRole || 'manager'; // Fallback to manager for validation
      const validTasks = staffConstants.STAFF_TASK_TYPES[staffRole]?.munch || [];
      if (!validTasks.includes(taskType)) {
        throw new Error(`Invalid task type for role: ${staffRole}`);
      }
      return true;
    }),
  body('task.description')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('task.dueDate')
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .custom((dueDate) => {
      if (new Date(dueDate) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    })
];

const trackTaskProgressValidation = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
];

const notifyTaskDelayValidation = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
];

module.exports = {
  assignTaskValidation,
  trackTaskProgressValidation,
  notifyTaskDelayValidation
};