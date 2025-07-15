'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const distributeTrainingValidation = [
  body('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer'),
  body('training.category')
    .isIn(staffConstants.STAFF_TRAINING_TYPES)
    .withMessage(`Training category must be one of: ${staffConstants.STAFF_TRAINING_TYPES.join(', ')}`),
  body('training.content')
    .isString().withMessage('Content must be a string')
    .isLength({ max: 1000 }).withMessage('Content must not exceed 1000 characters')
];

const trackTrainingCompletionValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

const assessTrainingComplianceValidation = [
  param('staffId')
    .isInt({ min: 1 }).withMessage('Staff ID must be a positive integer')
];

module.exports = {
  distributeTrainingValidation,
  trackTrainingCompletionValidation,
  assessTrainingComplianceValidation
};