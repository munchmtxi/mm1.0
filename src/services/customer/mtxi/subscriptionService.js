'use strict';

const { Subscription, SubscriptionShare, RideSubscription, Customer } = require('@models');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { SUBSCRIPTION_RIDE_LIMITS } = require('@constants/common/subscriptionConstants');

const shareSubscription = async (userId, subscriptionId, friendId) => {
  return sequelize.transaction(async (t) => {
    // Prevent self-sharing
    if (userId === friendId) {
      logger.warn('Cannot share subscription with self', { transactionId: t.id, userId, friendId });
      throw new AppError('Cannot share subscription with self', 400, 'INVALID_INPUT');
    }

    const customer = await Customer.findOne({ where: { user_id: userId }, transaction: t });
    const friendCustomer = await Customer.findOne({ where: { user_id: friendId }, transaction: t });
    if (!customer || !friendCustomer) {
      logger.error('Customer or friend not found', { transactionId: t.id, userId, friendId });
      throw new AppError('Customer or friend not found', 404, 'NOT_FOUND');
    }

    const subscription = await Subscription.findOne({ where: { id: subscriptionId, customer_id: customer.id }, transaction: t });
    if (!subscription || !['ride_standard', 'ride_premium'].includes(subscription.type)) {
      logger.warn('Invalid or non-ride subscription', { transactionId: t.id, subscriptionId });
      throw new AppError('Only ride subscriptions can be shared', 400, 'INVALID_SUBSCRIPTION');
    }

    if (subscription.status !== 'active') {
      logger.warn('Subscription not active', { transactionId: t.id, subscriptionId, status: subscription.status });
      throw new AppError('Only active subscriptions can be shared', 400, 'INVALID_SUBSCRIPTION_STATUS');
    }

    // Check subscription expiry
    if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
      logger.warn('Subscription expired', { transactionId: t.id, subscriptionId, end_date: subscription.end_date });
      throw new AppError('Subscription has expired', 400, 'EXPIRED_SUBSCRIPTION');
    }

    // Limit to one share per subscription
    const shareCount = await SubscriptionShare.count({
      where: { subscription_id: subscriptionId, status: ['invited', 'accepted'] },
      transaction: t,
    });
    if (shareCount >= 1) {
      logger.warn('Subscription share limit reached', { transactionId: t.id, subscriptionId });
      throw new AppError('Subscription can only be shared with one friend', 400, 'SHARE_LIMIT_REACHED');
    }

    const existingShare = await SubscriptionShare.findOne({
      where: { subscription_id: subscriptionId, customer_id: friendCustomer.id },
      transaction: t,
    });
    if (existingShare) {
      logger.warn('Subscription already shared with this friend', { transactionId: t.id, subscriptionId, friendId });
      throw new AppError('Subscription already shared', 400, 'ALREADY_SHARED');
    }

    const share = await SubscriptionShare.create({
      subscription_id: subscriptionId,
      customer_id: friendCustomer.id,
      status: 'invited',
    }, { transaction: t });

    socketService.emitToUser(friendId, 'subscription:invite', { userId, friendId, subscriptionId });
    logger.info('Subscription shared', { transactionId: t.id, subscriptionId, customerId: customer.id, friendId });

    return share;
  });
};

const respondToSubscriptionShare = async (userId, subscriptionId, accept) => {
  return sequelize.transaction(async (t) => {
    const customer = await Customer.findOne({ where: { user_id: userId }, transaction: t });
    if (!customer) {
      logger.error('Customer not found', { transactionId: t.id, userId });
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const share = await SubscriptionShare.findOne({
      where: { subscription_id: subscriptionId, customer_id: customer.id },
      transaction: t,
    });
    if (!share) {
      logger.warn('Subscription share not found', { transactionId: t.id, subscriptionId, customerId: customer.id });
      throw new AppError('Subscription share not found', 404, 'NOT_FOUND');
    }

    share.status = accept ? 'accepted' : 'rejected';
    share.responded_at = new Date();
    await share.save({ transaction: t });

    const subscription = await Subscription.findByPk(subscriptionId, { transaction: t });
    if (!subscription) {
      logger.error('Subscription not found', { transactionId: t.id, subscriptionId });
      throw new AppError('Subscription not found', 404, 'NOT_FOUND');
    }

    // Check subscription expiry
    if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
      logger.warn('Subscription expired', { transactionId: t.id, subscriptionId, end_date: subscription.end_date });
      throw new AppError('Subscription has expired', 400, 'EXPIRED_SUBSCRIPTION');
    }

    if (accept && ['ride_standard', 'ride_premium'].includes(subscription.type)) {
      // Prevent duplicate RideSubscription
      const existingRideSubscription = await RideSubscription.findOne({
        where: { subscription_id: subscriptionId, customer_id: customer.id },
        transaction: t,
      });
      if (existingRideSubscription) {
        logger.warn('Ride subscription already exists', { transactionId: t.id, subscriptionId, customerId: customer.id });
        throw new AppError('Ride subscription already exists', 400, 'ALREADY_EXISTS');
      }

      await RideSubscription.create({
        subscription_id: subscriptionId,
        customer_id: customer.id,
        rides_remaining: SUBSCRIPTION_RIDE_LIMITS[subscription.type.toUpperCase()],
        day_of_week: subscription.day_of_week,
        time: subscription.time,
        pickup_location: subscription.pickup_location,
        dropoff_location: subscription.dropoff_location,
        ride_type: subscription.ride_type,
      }, { transaction: t });
    }

    // Emit to owner's user_id
    const ownerCustomer = await Customer.findOne({ where: { id: subscription.customer_id }, transaction: t });
    if (ownerCustomer) {
      socketService.emitToUser(ownerCustomer.user_id, 'subscription:updated', { subscriptionId, status: share.status });
    } else {
      logger.warn('Owner customer not found for socket event', { transactionId: t.id, subscriptionId, customerId: subscription.customer_id });
    }

    logger.info('Subscription share responded', { transactionId: t.id, subscriptionId, customerId: customer.id, status: share.status });
    return share;
  });
};

const createRideSubscription = async (userId, subscriptionData, options = {}) => {
  const transaction = options.transaction || await sequelize.transaction();
  try {
    const customer = await Customer.findOne({ where: { user_id: userId, deleted_at: null }, transaction });
    if (!customer) {
      logger.error('Customer not found', { userId });
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const { type, schedule, total_amount, start_date, end_date, day_of_week, time, pickup_location, dropoff_location, ride_type } = subscriptionData;

    const subscription = await Subscription.create({
      customer_id: customer.id,
      type,
      schedule,
      total_amount,
      start_date: start_date || new Date(),
      end_date,
      status: 'active',
      merchant_id: null,
      menu_item_id: null,
    }, { transaction });

    const rideSubscription = await RideSubscription.create({
      subscription_id: subscription.id,
      customer_id: customer.id,
      rides_remaining: SUBSCRIPTION_RIDE_LIMITS[type.toUpperCase()] || 0,
      day_of_week,
      time,
      pickup_location,
      dropoff_location,
      ride_type,
    }, { transaction });

    if (!options.transaction) {
      await transaction.commit();
    }
    logger.info('Ride subscription created', { subscriptionId: subscription.id, rideSubscriptionId: rideSubscription.id, userId });
    return rideSubscription;
  } catch (error) {
    if (!options.transaction) {
      await transaction.rollback();
    }
    logger.error('Failed to create ride subscription', { error: error.message, userId });
    throw error instanceof AppError ? error : new AppError('Failed to create subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { shareSubscription, respondToSubscriptionShare, createRideSubscription };