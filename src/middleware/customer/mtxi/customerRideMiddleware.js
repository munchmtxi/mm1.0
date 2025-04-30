'use strict';
const { check, body, param, query, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Ride, Customer } = require('@models');
const { RIDE_TYPES, RIDE_STATUSES, PARTICIPANT_STATUSES } = require('@constants/common/rideConstants');

const validateRideRequest = [
  body('pickup')
    .isObject()
    .withMessage('Pickup must be an object')
    .custom((value) => {
      if (!value.lat || !value.lng) throw new Error('Pickup must include lat and lng');
      if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) {
        throw new Error('Pickup lat and lng must be within valid ranges');
      }
      return true;
    }),
  body('dropoff')
    .isObject()
    .withMessage('Dropoff must be an object')
    .custom((value) => {
      if (!value.lat || !value.lng) throw new Error('Dropoff must include lat and lng');
      if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) {
        throw new Error('Dropoff lat and lng must be within valid ranges');
      }
      return true;
    }),
  body('ride_type')
    .optional()
    .isIn(Object.values(RIDE_TYPES))
    .withMessage(`Ride type must be one of: ${Object.values(RIDE_TYPES).join(', ')}`),
  body('stops')
    .optional()
    .isArray()
    .withMessage('Stops must be an array')
    .custom((stops) => {
      if (stops.length > 0) {
        return stops.every((stop) => {
          if (!stop.lat || !stop.lng) throw new Error('Each stop must include lat and lng');
          if (stop.lat < -90 || stop.lat > 90 || stop.lng < -180 || stop.lng > 180) {
            throw new Error('Stop lat and lng must be within valid ranges');
          }
          return true;
        });
      }
      return true;
    }),
  body('scheduled_time')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date'),
  body('payment_method')
    .optional()
    .isString()
    .withMessage('Payment method must be a string'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride request validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid ride request inputs', 400, 'INVALID_INPUT'));
    }

    const customer = await Customer.findOne({ where: { user_id: req.user.id } });
    if (!customer) {
      logger.warn('Customer not found', { userId: req.user.id });
      return next(new AppError('Customer not found', 404, 'NOT_FOUND'));
    }

    logger.info('Ride request validated', { userId: req.user.id });
    next();
  },
];

const validateRideCancellation = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('Cancellation reason is required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride cancellation validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid cancellation inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized ride cancellation attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (![RIDE_STATUSES.REQUESTED, RIDE_STATUSES.SCHEDULED, RIDE_STATUSES.ASSIGNED, RIDE_STATUSES.ARRIVED].includes(ride.status)) {
      logger.warn('Cannot cancel ride in current status', { rideId: req.params.rideId, status: ride.status });
      return next(new AppError('Cannot cancel ride in current status', 400, 'INVALID_STATUS'));
    }

    logger.info('Ride cancellation validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateParticipantInvitation = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Participant invitation validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid invitation inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized participant invitation attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (ride.status !== RIDE_STATUSES.REQUESTED) {
      logger.warn('Cannot invite participant in current status', { rideId: req.params.rideId, status: ride.status });
      return next(new AppError('Cannot invite participant in current status', 400, 'INVALID_STATUS'));
    }

    const participant = await Customer.findByPk(req.body.customerId);
    if (!participant) {
      logger.warn('Participant not found', { customerId: req.body.customerId, userId: req.user.id });
      return next(new AppError('Participant not found', 404, 'NOT_FOUND'));
    }

    logger.info('Participant invitation validated', { rideId: req.params.rideId, customerId: req.body.customerId, userId: req.user.id });
    next();
  },
];

const validateRideStop = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('stop')
    .isObject()
    .withMessage('Stop must be an object')
    .custom((value) => {
      if (!value.lat || !value.lng) throw new Error('Stop must include lat and lng');
      if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) {
        throw new Error('Stop lat and lng must be within valid ranges');
      }
      return true;
    }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride stop validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid stop inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized ride stop attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (![RIDE_STATUSES.REQUESTED, RIDE_STATUSES.SCHEDULED, RIDE_STATUSES.ASSIGNED].includes(ride.status)) {
      logger.warn('Cannot add stop in current status', { rideId: req.params.rideId, status: ride.status });
      return next(new AppError('Cannot add stop in current status', 400, 'INVALID_STATUS'));
    }

    logger.info('Ride stop validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateRideReview = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isString()
    .withMessage('Comment must be a string'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride review validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid review inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized ride review attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (ride.status !== RIDE_STATUSES.COMPLETED) {
      logger.warn('Cannot review ride that is not completed', { rideId: req.params.rideId, status: ride.status });
      return next(new AppError('Cannot review ride that is not completed', 400, 'INVALID_STATUS'));
    }

    logger.info('Ride review validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateSupportTicket = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('subject')
    .isString()
    .notEmpty()
    .withMessage('Subject is required'),
  body('description')
    .isString()
    .notEmpty()
    .withMessage('Description is required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Support ticket validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid support ticket inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized support ticket attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    logger.info('Support ticket validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateRideMessage = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('message')
    .isString()
    .notEmpty()
    .withMessage('Message is required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride message validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid message inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized ride message attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (![RIDE_STATUSES.ASSIGNED, RIDE_STATUSES.ARRIVED, RIDE_STATUSES.STARTED].includes(ride.status)) {
      logger.warn('Cannot send message in current status', { rideId: req.params.rideId, status: ride.status });
      return next(new AppError('Cannot send message in current status', 400, 'INVALID_STATUS'));
    }

    logger.info('Ride message validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateDriverInfo = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Driver info validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid driver info inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized driver info attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    if (!ride.driver_id) {
      logger.warn('No driver assigned to ride', { rideId: req.params.rideId });
      return next(new AppError('No driver assigned to ride', 400, 'NO_DRIVER'));
    }

    logger.info('Driver info validated', { rideId: req.params.rideId, userId: req.user.id });
    next();
  },
];

const validateRideStatusUpdate = [
  param('rideId')
    .isInt({ min: 1 })
    .withMessage('Ride ID must be a positive integer'),
  body('status')
    .isIn(Object.values(RIDE_STATUSES))
    .withMessage(`Status must be one of: ${Object.values(RIDE_STATUSES).join(', ')}`),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ride status update validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError('Invalid status update inputs', 400, 'INVALID_INPUT'));
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      logger.warn('Ride not found', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Ride not found', 404, 'NOT_FOUND'));
    }

    const customer = await ride.getCustomer();
    if (!customer || customer.user_id !== req.user.id) {
      logger.warn('Unauthorized ride status update attempt', { rideId: req.params.rideId, userId: req.user.id });
      return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
    }

    logger.info('Ride status update validated', { rideId: req.params.rideId, status: req.body.status, userId: req.user.id });
    next();
  },
];

module.exports = {
  validateRideRequest,
  validateRideCancellation,
  validateParticipantInvitation,
  validateRideStop,
  validateRideReview,
  validateSupportTicket,
  validateRideMessage,
  validateDriverInfo,
  validateRideStatusUpdate,
};