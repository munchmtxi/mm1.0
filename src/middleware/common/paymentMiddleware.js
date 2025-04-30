'use strict';

const { Payment } = require('@models');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validatePaymentIntent = catchAsync(async (req, res, next) => {
  const { amount, type, metadata } = req.body;

  if (!amount || amount <= 0) {
    logger.warn('Invalid payment amount', { amount, userId: req.user.id });
    return next(new AppError('Valid amount is required', 400, 'INVALID_INPUT'));
  }

  const validTypes = ['fare', 'subscription', 'tip'];
  if (!type || !validTypes.includes(type)) {
    logger.warn('Invalid payment type', { type, userId: req.user.id });
    return next(new AppError('Invalid payment type', 400, 'INVALID_INPUT'));
  }

  if (type === 'tip' && (!metadata || !metadata.ride_id || !metadata.driver_id)) {
    logger.warn('Missing tip metadata', { metadata, userId: req.user.id });
    return next(new AppError('Ride ID and driver ID required for tip', 400, 'INVALID_INPUT'));
  }

  logger.info('Payment intent validated', { type, userId: req.user.id });
  next();
});

const validatePaymentConfirmation = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    logger.warn('Payment not found', { paymentId, userId: req.user.id });
    return next(new AppError('Payment not found', 404, 'NOT_FOUND'));
  }

  const customer = await payment.getCustomer();
  if (!customer || customer.user_id !== req.user.id) {
    logger.warn('Unauthorized payment confirmation attempt', { paymentId, userId: req.user.id });
    return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
  }

  if (payment.status !== 'pending') {
    logger.warn('Payment not in pending state', { paymentId, status: payment.status, userId: req.user.id });
    return next(new AppError('Payment cannot be confirmed', 400, 'INVALID_STATUS'));
  }

  logger.info('Payment confirmation validated', { paymentId, userId: req.user.id });
  req.payment = payment; // Attach payment to request
  next();
});

module.exports = { validatePaymentIntent, validatePaymentConfirmation };