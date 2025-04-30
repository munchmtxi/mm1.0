'use strict';

const { check, param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { SUBSCRIPTION_STATUSES, ERROR_CODES } = require('@constants/common/subscriptionConstants');

// Define dispute actions inline since DISPUTE_ACTIONS was removed
const DISPUTE_ACTIONS = {
  REFUND: 'refund',
  CANCEL: 'cancel',
  IGNORE: 'ignore',
};

const validateSubscriptionId = [
  param('subscriptionId')
    .isInt({ min: 1 })
    .withMessage('Subscription ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription ID validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid subscription ID', 400, ERROR_CODES.INVALID_INPUT));
    }
    next();
  },
];

const validateSubscriptionStatus = [
  param('subscriptionId')
    .isInt({ min: 1 })
    .withMessage('Subscription ID must be a positive integer'),
  check('status')
    .isIn(Object.values(SUBSCRIPTION_STATUSES))
    .withMessage(`Status must be one of: ${Object.values(SUBSCRIPTION_STATUSES).join(', ')}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription status validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid status inputs', 400, ERROR_CODES.INVALID_INPUT));
    }
    next();
  },
];

const validateSubscriptionDispute = [
  param('subscriptionId')
    .isInt({ min: 1 })
    .withMessage('Subscription ID must be a positive integer'),
  check('action')
    .isIn(Object.values(DISPUTE_ACTIONS))
    .withMessage(`Action must be one of: ${Object.values(DISPUTE_ACTIONS).join(', ')}`),
  check('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Reason is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription dispute validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid dispute inputs', 400, ERROR_CODES.INVALID_INPUT));
    }
    next();
  },
];

module.exports = { validateSubscriptionId, validateSubscriptionStatus, validateSubscriptionDispute };