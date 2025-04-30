'use strict';

const { check, param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validateTipSubmission = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Tip submission validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid tip inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validateTipSubmission };