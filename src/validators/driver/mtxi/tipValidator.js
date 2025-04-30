'use strict';

const { param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validateTipConfirmation = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Tip confirmation validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid payment ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validateTipConfirmation };