'use strict';

const { Subscription, RideSubscription, Customer } = require('@models');
const paymentService = require('@services/common/paymentService');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { SUBSCRIPTION_TYPES, SUBSCRIPTION_SCHEDULES } = require('@constants/customer/subscriptionConstants');

const createSubscription = async (userId, subscriptionData) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    logger.error('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const {
    type,
    schedule,
    total_amount,
    merchant_id,
    menu_item_id,
    day_of_week,
    time,
    pickup_location,
    dropoff_location,
    ride_type
  } = subscriptionData;

  // Validate subscription type and schedule
  if (!Object.values(SUBSCRIPTION_TYPES).includes(type)) {
    logger.warn('Invalid subscription type', { type });
    throw new AppError(`Invalid subscription type. Must be one of: ${Object.values(SUBSCRIPTION_TYPES).join(', ')}`, 400, 'INVALID_SUBSCRIPTION');
  }

  if (!Object.values(SUBSCRIPTION_SCHEDULES).includes(schedule)) {
    logger.warn('Invalid subscription schedule', { schedule });
    throw new AppError(`Invalid subscription schedule. Must be one of: ${Object.values(SUBSCRIPTION_SCHEDULES).join(', ')}`, 400, 'INVALID_SCHEDULE');
  }

  // Validate total_amount
  if (!total_amount || total_amount <= 0) {
    logger.warn('Invalid total amount', { total_amount });
    throw new AppError('Total amount must be a positive number', 400, 'INVALID_SUBSCRIPTION');
  }

  // For ride subscriptions, menu_item_id must be null
  if (['ride_basic', 'ride_premium'].includes(type) && menu_item_id !== undefined && menu_item_id !== null) {
    logger.warn('Menu item ID must be null for ride subscriptions', { type, menu_item_id });
    throw new AppError('Menu item ID must be null for ride subscriptions', 400, 'INVALID_SUBSCRIPTION');
  }

  // For food subscriptions, menu_item_id is required
  if (type === 'food' && !menu_item_id) {
    logger.warn('Menu item ID is required for food subscriptions', { type });
    throw new AppError('Menu item ID is required for food subscriptions', 400, 'INVALID_SUBSCRIPTION');
  }

  // Create payment intent
  const payment = await paymentService.createPaymentIntent(userId, total_amount, 'subscription', merchant_id, { subscription_type: type });
  if (payment.status !== 'pending') {
    await paymentService.handlePaymentFailure(payment.id, 'Unexpected payment status');
    throw new AppError('Payment initialization failed', 400, 'PAYMENT_FAILED');
  }

  // Confirm payment
  await paymentService.confirmPayment(payment.id, userId);

  // Create subscription
  const subscription = await Subscription.create({
    customer_id: customer.id,
    merchant_id: merchant_id || null, // Optional for rides
    menu_item_id: menu_item_id || null,
    type,
    schedule,
    total_amount,
    status: 'active',
    start_date: new Date(),
  });

  // Create RideSubscription for ride subscriptions
  if (['ride_basic', 'ride_premium'].includes(type)) {
    await RideSubscription.create({
      subscription_id: subscription.id,
      customer_id: customer.id,
      rides_remaining: type === 'ride_basic' ? 10 : 30,
      day_of_week: day_of_week || null,
      time: time || null,
      pickup_location: pickup_location || null,
      dropoff_location: dropoff_location || null,
      ride_type: ride_type || 'STANDARD'
    });
  }

  // Emit socket events
  socketService.emitToUser(userId, 'subscription:updated', { subscriptionId: subscription.id, status: subscription.status });
  socketService.emitToRoom('admin:taxi', 'subscription:updated', { subscriptionId: subscription.id, customerId: customer.id });

  logger.info('Subscription created', { subscriptionId: subscription.id, customerId: customer.id });
  return subscription;
};

const updateSubscription = async (userId, subscriptionId, updates) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    logger.error('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const subscription = await Subscription.findOne({ where: { id: subscriptionId, customer_id: customer.id } });
  if (!subscription) {
    logger.warn('Subscription not found', { subscriptionId });
    throw new AppError('Subscription not found', 404, 'NOT_FOUND');
  }

  const allowedUpdates = ['status', 'schedule', 'day_of_week', 'time', 'pickup_location', 'dropoff_location', 'ride_type'];
  const validUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));
  if (!validUpdates.length) {
    logger.warn('No valid updates provided', { subscriptionId });
    throw new AppError('No valid updates provided', 400, 'INVALID_UPDATE');
  }

  if (updates.status && !['active', 'paused', 'canceled'].includes(updates.status)) {
    logger.warn('Invalid subscription status', { status: updates.status });
    throw new AppError('Invalid subscription status', 400, 'INVALID_STATUS');
  }

  if (updates.schedule && !Object.values(SUBSCRIPTION_SCHEDULES).includes(updates.schedule)) {
    logger.warn('Invalid subscription schedule', { schedule: updates.schedule });
    throw new AppError(`Invalid subscription schedule. Must be one of: ${Object.values(SUBSCRIPTION_SCHEDULES).join(', ')}`, 400, 'INVALID_SCHEDULE');
  }

  // Update Subscription
  await subscription.update(updates);

  // Update RideSubscription for ride-specific fields
  if (['ride_basic', 'ride_premium'].includes(subscription.type)) {
    const rideSubscription = await RideSubscription.findOne({ where: { subscription_id: subscription.id, customer_id: customer.id } });
    if (rideSubscription) {
      const rideUpdates = {};
      if (updates.day_of_week) rideUpdates.day_of_week = updates.day_of_week;
      if (updates.time) rideUpdates.time = updates.time;
      if (updates.pickup_location) rideUpdates.pickup_location = updates.pickup_location;
      if (updates.dropoff_location) rideUpdates.dropoff_location = updates.dropoff_location;
      if (updates.ride_type) rideUpdates.ride_type = updates.ride_type;
      await rideSubscription.update(rideUpdates);
    }
  }

  // Emit socket events
  socketService.emitToUser(userId, 'subscription:updated', { subscriptionId: subscription.id, status: subscription.status });
  socketService.emitToRoom('admin:taxi', 'subscription:updated', { subscriptionId: subscription.id, customerId: customer.id });

  logger.info('Subscription updated', { subscriptionId: subscription.id, customerId: customer.id });
  return subscription;
};

module.exports = { createSubscription, updateSubscription };