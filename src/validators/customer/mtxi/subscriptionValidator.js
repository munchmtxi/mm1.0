'use strict';

const { check, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { SUBSCRIPTION_TYPES, SUBSCRIPTION_SCHEDULES, DAYS_OF_WEEK, RIDE_TYPES } = require('@constants/common/subscriptionConstants');
const { Customer } = require('@models');

const validateSubscriptionCreation = [
  check('type')
    .isIn(Object.values(SUBSCRIPTION_TYPES))
    .withMessage(`Type must be one of: ${Object.values(SUBSCRIPTION_TYPES).join(', ')}`),
  check('schedule')
    .isIn(Object.values(SUBSCRIPTION_SCHEDULES))
    .withMessage(`Schedule must be one of: ${Object.values(SUBSCRIPTION_SCHEDULES).join(', ')}`),
  check('total_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be a positive number'),
  check('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),
  check('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),
  check('day_of_week')
    .optional()
    .isIn(DAYS_OF_WEEK)
    .withMessage(`Day of week must be one of: ${DAYS_OF_WEEK.join(', ')}`),
  check('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  check('pickup_location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  check('pickup_location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  check('dropoff_location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Dropoff latitude must be between -90 and 90'),
  check('dropoff_location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Dropoff longitude must be between -180 and 180'),
  check('ride_type')
    .optional()
    .isIn(RIDE_TYPES)
    .withMessage(`Ride type must be one of: ${RIDE_TYPES.join(', ')}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription creation validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError(`Invalid subscription inputs: ${errors.array().map(e => e.msg).join(', ')}`, 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateSubscriptionShare = [
  check('subscriptionId')
    .isInt({ min: 1 })
    .withMessage('Subscription ID must be a positive integer'),
  check('friendId')
    .isInt({ min: 1 })
    .withMessage('Friend ID must be a positive integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription share validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError(`Invalid share inputs: ${errors.array().map(e => e.msg).join(', ')}`, 400, 'INVALID_INPUT'));
    }
    const friendCustomer = await Customer.findOne({ where: { user_id: req.body.friendId } });
    if (!friendCustomer) {
      logger.warn('Friend not found', { friendId: req.body.friendId, userId: req.user.id });
      return next(new AppError('Friend not found', 404, 'NOT_FOUND'));
    }
    next();
  },
];

const validateSubscriptionShareResponse = [
  check('subscriptionId')
    .isInt({ min: 1 })
    .withMessage('Subscription ID must be a positive integer'),
  check('accept')
    .isBoolean()
    .withMessage('Accept must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Subscription share response validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError(`Invalid response inputs: ${errors.array().map(e => e.msg).join(', ')}`, 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = { validateSubscriptionCreation, validateSubscriptionShare, validateSubscriptionShareResponse };