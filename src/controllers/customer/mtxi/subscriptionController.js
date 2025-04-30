'use strict';

const commonSubscriptionService = require('@services/customer/mtxi/subscriptionService');
const paymentService = require('@services/common/paymentService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const models = require('@models');
const { sequelize, Payment } = models;

// Log only non-circular properties of models
logger.info('Models import in subscriptionController:', {
  modelNames: Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize'),
  sequelizeDefined: !!sequelize
});

const createSubscription = catchAsync(async (req, res, next) => {
  logger.info('createSubscription request body', { body: req.body });

  const { type, schedule, total_amount, start_date, end_date, day_of_week, time, pickup_location, dropoff_location, ride_type } = req.body;

  const missingFields = [];
  if (!type) missingFields.push('type');
  if (!schedule) missingFields.push('schedule');
  if (!total_amount) missingFields.push('total_amount');
  if (missingFields.length > 0) {
    return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400, 'INVALID_INPUT'));
  }

  if (end_date && new Date(end_date) <= new Date(start_date || new Date())) {
    return next(new AppError('End date must be after start date', 400, 'INVALID_INPUT'));
  }

  const transaction = await sequelize.transaction();
  try {
    if (typeof paymentService.createPaymentIntent !== 'function') {
      logger.error('paymentService.createPaymentIntent is not a function', { paymentServiceKeys: Object.keys(paymentService) });
      throw new AppError('Payment service misconfigured', 500, 'INTERNAL_SERVER_ERROR');
    }
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
    logger.info('Calling confirmPayment', { paymentId: payment.id, userId: req.user.id });
    await paymentService.confirmPayment(payment.id, req.user.id, { transaction });
    // Refresh payment to get updated status
    const updatedPayment = await Payment.findByPk(payment.id, { transaction });
    if (!updatedPayment) {
      throw new AppError('Failed to retrieve updated payment', 500, 'INTERNAL_SERVER_ERROR');
    }
    await transaction.commit();
    logger.info('Customer created subscription with payment', { subscriptionId: subscription.id, userId: req.user.id });
    res.status(201).json({
      status: 'success',
      data: { subscription, payment: updatedPayment.toJSON() }, // Use updatedPayment
    });
  } catch (error) {
    logger.error('Error during subscription creation', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      userId: req.user.id
    });
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction', { rollbackError: rollbackError.message });
    }
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
  try {
    const share = await commonSubscriptionService.shareSubscription(req.user.id, subscriptionId, friendId);
    logger.info('Customer shared subscription', { subscriptionId, friendId, userId: req.user.id });
    res.status(201).json({
      status: 'success',
      data: { share },
    });
  } catch (error) {
    logger.error('Error during subscription sharing', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      userId: req.user.id,
      subscriptionId,
      friendId
    });
    throw error instanceof AppError ? error : new AppError('Failed to share subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const respondToSubscriptionShare = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { accept } = req.body;
  if (accept === undefined) {
    return next(new AppError('Accept flag is required', 400, 'INVALID_INPUT'));
  }
  try {
    const share = await commonSubscriptionService.respondToSubscriptionShare(req.user.id, subscriptionId, accept);
    logger.info('Customer responded to subscription share', { subscriptionId, accept, userId: req.user.id });
    res.status(200).json({
      status: 'success',
      data: { share },
    });
  } catch (error) {
    logger.error('Error during subscription share response', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      userId: req.user.id,
      subscriptionId,
      accept
    });
    throw error instanceof AppError ? error : new AppError('Failed to respond to subscription share', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = { createSubscription, shareSubscription, respondToSubscriptionShare };