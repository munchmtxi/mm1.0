'use strict';

const { check, param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validateTipId = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Tip ID validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid payment ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateTipDispute = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  check('action')
    .isIn(['refund', 'confirm', 'ignore'])
    .withMessage('Action must be refund, confirm, or ignore'),
  check('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Reason is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Tip dispute validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid dispute inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validateTipId, validateTipDispute };