'use strict';

const { check, param, query, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const rideConstants = require('@constants/common/rideConstants');

const { PAYMENT_TYPES, RIDE_STATUSES, ALERT_SEVERITIES, DISPUTE_ACTIONS } = rideConstants;

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

const validateRideAlert = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('message')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Alert message is required'),
  check('severity')
    .isIn(Object.values(ALERT_SEVERITIES))
    .withMessage('Severity must be one of: ' + Object.values(ALERT_SEVERITIES).join(', ')),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride alert validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid alert inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateRideDispute = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('action')
    .isIn(Object.values(DISPUTE_ACTIONS))
    .withMessage('Action must be one of: ' + Object.values(DISPUTE_ACTIONS).join(', ')),
  check('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Dispute reason is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride dispute validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid dispute inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateRideAnalytics = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('status')
    .optional()
    .isIn(Object.values(RIDE_STATUSES))
    .withMessage('Invalid ride status'),
  query('reportType')
    .optional()
    .isIn(['general', 'finance', 'operations', 'compliance'])
    .withMessage('Report type must be general, finance, operations, or compliance'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride analytics validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid analytics filters', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateAssignDriver = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  check('driverId')
    .isInt({ min: 1 })
    .withMessage('Driver ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Assign driver validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid input', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateDriverId = [
  param('driverId')
    .isInt({ min: 1 })
    .withMessage('Driver ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Driver ID validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid driver ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validatePaymentId = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Payment ID validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid payment ID', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validatePaymentDispute = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
  check('action')
    .isIn(Object.values(DISPUTE_ACTIONS))
    .withMessage('Action must be one of: ' + Object.values(DISPUTE_ACTIONS).join(', ')),
  check('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Dispute reason is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Payment dispute validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid dispute inputs', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validatePaymentAnalysis = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('type')
    .optional()
    .isIn([PAYMENT_TYPES.FARE, PAYMENT_TYPES.TIP, PAYMENT_TYPES.PAYMENT])
    .withMessage('Type must be fare, tip, or payment'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'authorized', 'completed', 'failed', 'refunded', 'cancelled', 'verified'])
    .withMessage('Status must be pending, processing, authorized, completed, failed, refunded, cancelled, or verified'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Payment analysis validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid analysis filters', 400, 'INVALID_INPUT'));
    }
    next();
  },
];

module.exports = {
  validateRideId,
  validateRideAlert,
  validateRideDispute,
  validateRideAnalytics,
  validateAssignDriver,
  validateDriverId,
  validatePaymentId,
  validatePaymentDispute,
  validatePaymentAnalysis,
};
