'use strict';

/**
 * Subscription Service for mtxi (Admin)
 * Manages subscription pricing, usage, rewards, and changes for mtxi customers.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Subscription, Ride, Customer } = require('@models');
const rideConstants = require('@constants/common/rideConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');
const { Op } = require('sequelize');

/**
 * Sets subscription pricing for a plan.
 * @param {number} planId - Plan ID (1 for BASIC, 2 for PREMIUM).
 * @param {Object} pricing - { amount: number, currency: string }.
 * @returns {Object} Updated plan details.
 */
async function configureRideSubscriptions(planId, pricing) {
  try {
    if (!planId || !pricing?.amount || !pricing?.currency) {
      throw new AppError(
        'invalid plan_id or pricing details',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const plan = planId === 1 ? 'BASIC' : planId === 2 ? 'PREMIUM' : null;
    if (!plan) {
      throw new AppError(
        'invalid plan_id',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    if (!rideConstants.RIDE_SETTINGS.SUPPORTED_CURRENCIES.includes(pricing.currency)) {
      throw new AppError(
        'unsupported currency',
        400,
        rideConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    const subscriptions = await Subscription.update(
      { total_amount: pricing.amount },
      { where: { plan, service_type: 'mtxi' }, returning: true }
    );

    const planDetails = {
      planId,
      plan,
      amount: pricing.amount,
      currency: pricing.currency,
      updatedCount: subscriptions[1].length,
    };

    // Log audit action
    await auditService.logAction({
      userId: 'admin',
      action: 'subscription_plan_updated',
      details: { planId, amount: pricing.amount, currency: pricing.currency },
      ipAddress: 'unknown',
    });

    logger.info('Subscription plan configured', { planId, amount: pricing.amount });
    return planDetails;
  } catch (error) {
    logger.logErrorEvent(`configureRideSubscriptions failed: ${error.message}`, { planId, pricing });
    throw error;
  }
}

/**
 * Tracks subscription enrollments and usage for a customer.
 * @param {number} customerId - Customer ID.
 * @returns {Object} Subscription usage details.
 */
async function monitorSubscriptionUsage(customerId) {
  try {
    if (!customerId) {
      throw new AppError(
        'customer_id required',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError(
        'customer not found',
        404,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const subscription = await Subscription.findOne({
      where: { customer_id: customerId, service_type: 'mtxi', status: 'active' },
      include: [{ model: Ride, as: 'rides', attributes: ['id', 'created_at'] }],
    });

    if (!subscription) {
      throw new AppError(
        'no active subscription found',
        404,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const usageDetails = {
      customerId,
      plan: subscription.plan,
      totalRides: subscription.rides.length,
      startDate: subscription.start_date,
      status: subscription.status,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: customerId.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'subscription.usage_updated',
      messageParams: { customerId, totalRides: usageDetails.totalRides },
      role: 'customer',
      module: 'mtxi',
    });

    // Log audit action
    await auditService.logAction({
      userId: customerId.toString(),
      action: 'subscription_usage_tracked',
      details: { customerId, totalRides: usageDetails.totalRides },
      ipAddress: 'unknown',
    });

    logger.info('Subscription usage monitored', { customerId, totalRides: usageDetails.totalRides });
    return usageDetails;
  } catch (error) {
    logger.logErrorEvent(`monitorSubscriptionUsage failed: ${error.message}`, { customerId });
    throw error;
  }
}

/**
 * Awards subscription reward points to a customer.
 * @param {number} customerId - Customer ID.
 * @returns {Object} Reward points details.
 */
async function awardSubscriptionRewards(customerId) {
  try {
    if (!customerId) {
      throw new AppError(
        'customer_id required',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError(
        'customer not found',
        404,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const subscription = await Subscription.findOne({
      where: { customer_id: customerId, service_type: 'mtxi', status: 'active' },
      include: [{ model: Ride, as: 'rides' }],
    });

    if (!subscription) {
      throw new AppError(
        'no active subscription found',
        404,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const points = subscription.rides.length * 10; // 10 points per ride
    await pointService.awardPoints({
      userId: customerId.toString(),
      points,
      action: 'subscription_ride',
      module: 'mtxi',
    });

    const rewardDetails = {
      customerId,
      pointsAwarded: points,
      totalRides: subscription.rides.length,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: customerId.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'rewarded',
      messageParams: { customerId, points: points },
      role: 'customer', totalRides
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'rewarded', {
      userId: customerId.toString(),
      role: 'customer',
      customerId,
      points,
    });

    // Log audit action
    await auditService.logAction({
      userId: customerId.toString(),
      action: 'reward_points',
      details: { customerId, points },
      ipAddress: 'unknown',
    });

    logger.info('Subscription points logged', { customerId, points });
    return rewardDetails;
  } catch (error) {
    logger.logErrorEvent('awardSubscriptionRewards failed', { customerId });
    throw error;
  }
}

/**
 * Handles subscription changes for a customer.
 * @param {number} customerId - Customer ID.
 * @param {Object} changeDetails - { action: 'pause' | 'cancel', ' | 'upgrade', new_plan: 'BASIC' | 'PREMIUM' }.
 * @returns {Object} Updated subscription details.
 */
async function manageSubscriptionChanges(customerId, changeDetails) {
  try {
    if (!customerId || !changeDetails?.action || !['pause', 'cancel', 'upgrade'].includes(changeDetails.action)) {
      throw new AppError(
        'invalid customer_id or change details',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError(
        'customer not found',
        404,
        rideConstants.ERROR_CODES.RIDE_NOT_FOUND
      );
    }

    const subscription = await Subscription.findOne({
      where: { customer_id: customerId, service_type: 'mtxi', status: { [Op.ne]: 'canceled' } },
    });

    if (!subscription) {
      throw new AppError(
        'no active or paused subscription found',
        404,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    let updates;
    if (changeDetails.action === 'pause') {
      updates = { status: 'paused' };
    } else if (changeDetails.action === 'cancel') {
      updates = { status: 'canceled', end_date: new Date() };
    } else if (changeDetails.action === 'upgrade') {
      if (!changeDetails.new_plan || !['BASIC', 'PREMIUM'].includes(changeDetails.new_plan)) {
        throw new AppError(
          'invalid new_plan',
          400,
          rideConstants.ERROR_CODES.INVALID_RIDE
      );
      }
      updates = { plan: changeDetails.new_plan };
    }

    await subscription.update(updates);

    const subscriptionDetails = {
      customerId,
      action: changeDetails.action,
      status: subscription.status,
      plan: subscription.plan,
      updatedAt: subscription.updated_at,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: customerId.toString(),
      type: rideConstants.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: `subscription_${changeDetails.action}`,
      messageParams: { customerId, plan: subscription.plan },
      role: 'customer',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'subscription:updated', {
      userId: customerId.toString(),
      role: 'customer',
      customerId,
      action: changeDetails.action,
      status: subscription.status,
    });

    // Log audit action
    await auditService.logAction({
      userId: customerId.toString(),
      action: `subscription_${changeDetails.action}`,
      details: { customerId, status: subscriptionDetails.status, plan: subscription.plan },
      ipAddress: 'unknown',
    });

    logger.info('Subscription updated', { customerId, action: changeDetails.action });
    return subscriptionDetails;
  } catch (error) {
    logger.logErrorEvent(`manageSubscriptionChanges failed: { customerId, changeDetails });
    throw error;
  }
}

module.exports = {
  configureRideSubscriptions,
  monitorSubscriptionUsage,
  awardSubscriptionRewards,
  manageSubscriptionChanges,
};