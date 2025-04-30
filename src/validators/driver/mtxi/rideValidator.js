'use strict';

const { check, param, query, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { STATUS_MAPPINGS } = require('@constants/common/rideConstants');

const validateRideId = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride ID validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid ride ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateDeclineRide = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('reason')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Reason must be a string between 1 and 255 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Decline ride validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid decline inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateRideStatus = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('status')
    .trim()
    .toLowerCase() // Normalize to lowercase
    .isIn(Object.keys(STATUS_MAPPINGS))
    .withMessage(`Status must be one of: ${Object.keys(STATUS_MAPPINGS).join(', ')}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride status validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid status inputs', 400, 'INVALID_INPUT'));
    }
    req.body.status = STATUS_MAPPINGS[req.body.status];
    next();
  },
];

const validateDriverReport = [
  check('driverId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Driver ID must be a positive integer'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Driver report validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid report query parameters', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validateRideId, validateDeclineRide, validateRideStatus, validateDriverReport };