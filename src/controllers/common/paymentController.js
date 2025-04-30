'use strict';

const paymentService = require('@services/common/paymentService');
const socketService = require('@services/common/socketService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const createPaymentIntent = catchAsync(async (req, res, next) => {
  const { amount, type, metadata = {} } = req.body;
  if (!amount || !type) {
    return next(new AppError('Amount and type are required', 400, 'INVALID_INPUT'));
  }

  // Support both ride_id and rideId in metadata
  const rideId = metadata.ride_id ?? metadata.rideId;
  if (type === 'fare' && (!rideId || !Number.isInteger(rideId) || rideId < 1)) {
    logger.warn('Ride ID required for fare payment', { userId: req.user.id, type, rideId });
    return next(new AppError('Valid rideId is required for fare payments', 400, 'INVALID_INPUT'));
  }

  const payment = await paymentService.createPaymentIntent(
    req.user.id,
    amount,
    type,
    null,
    { ...metadata, ride_id: rideId }
  );
  logger.info('Payment intent created', { paymentId: payment.id, userId: req.user.id, type, rideId });
  socketService.emitToUser(req.user.id, 'payment:created', { paymentId: payment.id, amount, type, rideId });

  res.status(201).json({
    status: 'success',
    data: { payment },
  });
});

const confirmPayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await paymentService.confirmPayment(paymentId, req.user.id);
  logger.info('Payment confirmed', { paymentId, userId: req.user.id });
  socketService.emitToUser(req.user.id, 'payment:confirmed', { paymentId, status: payment.status });
  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

module.exports = { createPaymentIntent, confirmPayment };
