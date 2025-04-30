'use strict';

const { RideSubscription, Subscription } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { SUBSCRIPTION_STATUSES, SUBSCRIPTION_RIDE_LIMITS, SUBSCRIPTION_TYPES } = require('@constants/common/subscriptionConstants');

const isSubscriptionEligibleForRide = async (subscriptionId, customerId, options = {}) => {
  try {
    const subscription = await RideSubscription.findOne({
      where: { subscription_id: subscriptionId, customer_id: customerId },
      include: [{ model: Subscription, as: 'subscription', where: { status: SUBSCRIPTION_STATUSES.ACTIVE } }],
      ...options,
    });

    if (!subscription) {
      logger.warn('Subscription not found or not active for customer', { subscriptionId, customerId });
      throw new AppError('Subscription not found or not active', 404, 'NOT_FOUND');
    }

    if (subscription.rides_remaining <= 0) {
      logger.warn('No rides remaining in subscription', { subscriptionId, customerId });
      throw new AppError('No rides remaining', 400, 'INSUFFICIENT_RIDES');
    }

    logger.info('Subscription eligible for ride', { subscriptionId, customerId });
    return true;
  } catch (error) {
    logger.error('Error in subscription validation', { error: error.message, stack: error.stack, subscriptionId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to validate subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const decrementRidesRemaining = async (subscriptionId, customerId, options = {}) => {
  try {
    const subscription = await RideSubscription.findOne({
      where: { subscription_id: subscriptionId, customer_id: customerId },
      ...options,
    });

    if (!subscription) {
      logger.warn('Subscription not found for decrement', { subscriptionId, customerId });
      throw new AppError('Subscription not found', 404, 'NOT_FOUND');
    }

    if (subscription.rides_remaining <= 0) {
      logger.warn('Cannot decrement rides, none remaining', { subscriptionId, customerId });
      throw new AppError('No rides remaining', 400, 'INSUFFICIENT_RIDES');
    }

    await subscription.update(
      { rides_remaining: subscription.rides_remaining - 1 },
      options
    );

    logger.info('Rides remaining decremented', { subscriptionId, customerId, rides_remaining: subscription.rides_remaining - 1 });
    return subscription.rides_remaining - 1;
  } catch (error) {
    logger.error('Error in decrementing rides', { error: error.message, stack: error.stack, subscriptionId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to decrement rides', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const createRideSubscription = async (subscriptionId, customerId, options = {}) => {
  try {
    const subscription = await Subscription.findOne({
      where: { id: subscriptionId, status: SUBSCRIPTION_STATUSES.ACTIVE },
      ...options,
    });

    if (!subscription) {
      logger.warn('Subscription not found or not active', { subscriptionId });
      throw new AppError('Subscription not found or not active', 404, 'NOT_FOUND');
    }

    if (![SUBSCRIPTION_TYPES.RIDE_STANDARD, SUBSCRIPTION_TYPES.RIDE_PREMIUM].includes(subscription.type)) {
      logger.warn('Invalid subscription type for ride subscription', { subscriptionId, type: subscription.type });
      throw new AppError('Subscription type not eligible for rides', 400, 'INVALID_SUBSCRIPTION_TYPE');
    }

    const rideLimit = SUBSCRIPTION_RIDE_LIMITS[subscription.type.toUpperCase()] || 0;
    if (rideLimit === 0) {
      logger.warn('No ride limit defined for subscription type', { subscriptionId, type: subscription.type });
      throw new AppError('Invalid ride limit for subscription type', 400, 'INVALID_RIDE_LIMIT');
    }

    const rideSubscription = await RideSubscription.create({
      subscription_id: subscriptionId,
      customer_id: customerId,
      rides_remaining: rideLimit,
      day_of_week: subscription.day_of_week,
      time: subscription.time,
      pickup_location: subscription.pickup_location,
      dropoff_location: subscription.dropoff_location,
      ride_type: subscription.ride_type,
    }, options);

    logger.info('Ride subscription created', { subscriptionId, customerId, rides_remaining: rideLimit });
    return rideSubscription;
  } catch (error) {
    logger.error('Error creating ride subscription', { error: error.message, stack: error.stack, subscriptionId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to create ride subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { isSubscriptionEligibleForRide, decrementRidesRemaining, createRideSubscription };