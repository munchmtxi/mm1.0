'use strict';

const commonSubscriptionService = require('@services/customer/mtxi/subscriptionService'); // Updated to use customer-specific service
const paymentService = require('@services/common/paymentService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('@models');

const createSubscription = catchAsync(async (req, res, next) => {
  logger.info('createSubscription request body', { body: req.body });

  const { type, schedule, total_amount, start_date, end_date, day_of_week, time, pickup_location, dropoff_location, ride_type } = req.body;

  const missingFields = [];
  if (!type) missingFields.push('type');
  if (!schedule) missingFields.push('schedule');
  if (!total_amount) missingFields.push |('total_amount');
  if (missingFields.length > 0) {
    return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400, 'INVALID_INPUT'));
  }

  if (end_date && new Date(end_date) <= new Date(start_date || new Date())) {
    return next(new AppError('End date must be after start date', 400, 'INVALID_INPUT'));
  }

  const transaction = await sequelize.transaction();
  try {
    const payment = await paymentService.createPaymentIntent(
      req.user.id,
      total_amount,
      'subscription',
      null,
      { subscription_type: type }
    );
    const subscription = await commonSubscriptionService.createRideSubscription(req.user.id, {
      type,
      schedule,
      total_amount,
      start_date,
      end_date,
      day_of_week,
      time,
      pickup_location,
      dropoff_location,
      ride_type,
    }, { transaction });
    await paymentService.confirmPayment(payment.id, req.user.id, { transaction });
    await transaction.commit();
    logger.info('Customer created subscription with payment', { subscriptionId: subscription.id, userId: req.user.id });
    res.status(201).json({
      status: 'success',
      data: { subscription, payment },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to create subscription', { error: error.message, userId: req.user.id });
    throw error instanceof AppError ? error : new AppError('Failed to create subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const shareSubscription = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { friendId } = req.body;
  if (!friendId) {
    return next(new AppError('Friend ID is required', 400, 'INVALID_INPUT'));
  }
  const share = await commonSubscriptionService.shareSubscription(req.user.id, subscriptionId, friendId);
  logger.info('Customer shared subscription', { subscriptionId, friendId, userId: req.user.id });
  res.status(201).json({
    status: 'success',
    data: { share },
  });
});

const respondToSubscriptionShare = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { accept } = req.body;
  if (accept === undefined) {
    return next(new AppError('Accept flag is required', 400, 'INVALID_INPUT'));
  }
  const share = await commonSubscriptionService.respondToSubscriptionShare(req.user.id, subscriptionId, accept);
  logger.info('Customer responded to subscription share', { subscriptionId, accept, userId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { share },
  });
});

module.exports = { createSubscription, shareSubscription, respondToSubscriptionShare };