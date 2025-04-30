'use strict';

const { check, param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validatePaymentIntent = [
  check('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  check('type')
    .isIn(['fare', 'subscription', 'tip'])
    .withMessage('Type must be fare, subscription, or tip'),
  check('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
    .custom((value, { req }) => {
      if (req.body.type === 'tip' && (!value.ride_id || !value.driver_id)) {
        throw new Error('Ride ID and driver ID required for tip');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Payment intent validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid payment inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validatePaymentConfirmation = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Payment confirmation validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid payment ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validatePaymentIntent, validatePaymentConfirmation };