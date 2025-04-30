'use strict';

const { Subscription, RideSubscription, SubscriptionShare, Customer, Payment } = require('@models');
const adminRideService = require('@services/admin/mtxi/adminRideService');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { Op } = require('sequelize');
const { SUBSCRIPTION_STATUSES, SUBSCRIPTION_TYPES, ERROR_CODES } = require('@constants/common/subscriptionConstants');

// Define dispute actions inline since DISPUTE_ACTIONS was removed
const DISPUTE_ACTIONS = {
  REFUND: 'refund',
  CANCEL: 'cancel',
  IGNORE: 'ignore',
};

const getSubscriptionDetails = async (subscriptionId) => {
  const subscription = await Subscription.findByPk(subscriptionId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: RideSubscription, as: 'rideSubscriptions', include: [{ model: Customer, as: 'customer' }] },
      { model: SubscriptionShare, as: 'shares', include: [{ model: Customer, as: 'customer' }] },
    ],
  });

  if (!subscription) {
    logger.error('Subscription not found', { subscriptionId });
    throw new AppError('Subscription not found', 404, ERROR_CODES.NOT_FOUND);
  }

  if (![SUBSCRIPTION_TYPES.RIDE_STANDARD, SUBSCRIPTION_TYPES.RIDE_PREMIUM].includes(subscription.type)) {
    logger.warn('Non-ride subscription accessed', { subscriptionId, type: subscription.type });
    throw new AppError('Only ride subscriptions are supported', 400, ERROR_CODES.INVALID_SUBSCRIPTION);
  }

  logger.info('Subscription details retrieved', { subscriptionId });
  return subscription;
};

const updateSubscriptionStatus = async (subscriptionId, status) => {
  return sequelize.transaction(async (t) => {
    const subscription = await Subscription.findByPk(subscriptionId, { transaction: t });
    if (!subscription) {
      logger.error('Subscription not found', { subscriptionId, transactionId: t.id });
      throw new AppError('Subscription not found', 404, ERROR_CODES.NOT_FOUND);
    }

    if (![SUBSCRIPTION_TYPES.RIDE_STANDARD, SUBSCRIPTION_TYPES.RIDE_PREMIUM].includes(subscription.type)) {
      logger.warn('Non-ride subscription accessed', { subscriptionId, type: subscription.type, transactionId: t.id });
      throw new AppError('Only ride subscriptions are supported', 400, ERROR_CODES.INVALID_SUBSCRIPTION);
    }

    if (!Object.values(SUBSCRIPTION_STATUSES).includes(status)) {
      logger.warn('Invalid subscription status', { status, transactionId: t.id });
      throw new AppError('Invalid subscription status', 400, ERROR_CODES.INVALID_STATUS);
    }

    subscription.status = status;
    await subscription.save({ transaction: t });

    const customer = await Customer.findByPk(subscription.customer_id, { attributes: ['user_id'], transaction: t });
    if (!customer) {
      logger.warn('Customer not found for socket emission', { subscriptionId, customerId: subscription.customer_id, transactionId: t.id });
    } else {
      socketService.emitToUser(customer.user_id, 'subscription:updated', { subscriptionId, status });
    }
    socketService.emitToRoom('admin:taxi', 'admin:subscriptionUpdate', { subscriptionId, status });

    logger.info('Subscription status updated', { subscriptionId, status, transactionId: t.id });
    return subscription;
  });
};

const handleSubscriptionDispute = async (subscriptionId, resolution) => {
  return sequelize.transaction(async (t) => {
    const subscription = await Subscription.findByPk(subscriptionId, { transaction: t });
    if (!subscription) {
      logger.error('Subscription not found', { subscriptionId, transactionId: t.id });
      throw new AppError('Subscription not found', 404, ERROR_CODES.NOT_FOUND);
    }

    if (![SUBSCRIPTION_TYPES.RIDE_STANDARD, SUBSCRIPTION_TYPES.RIDE_PREMIUM].includes(subscription.type)) {
      logger.warn('Non-ride subscription accessed', { subscriptionId, type: subscription.type, transactionId: t.id });
      throw new AppError('Only ride subscriptions are supported', 400, ERROR_CODES.INVALID_SUBSCRIPTION);
    }

    const { action, reason } = resolution;
    if (!Object.values(DISPUTE_ACTIONS).includes(action)) {
      logger.warn('Invalid dispute action', { action, transactionId: t.id });
      throw new AppError('Invalid dispute action', 400, ERROR_CODES.INVALID_ACTION);
    }

    if (action === DISPUTE_ACTIONS.CANCEL) {
      subscription.status = SUBSCRIPTION_STATUSES.CANCELED;
      await subscription.save({ transaction: t });
    } else if (action === DISPUTE_ACTIONS.REFUND) {
      const payment = await Payment.findOne({
        where: {
          customer_id: subscription.customer_id,
          payment_details: { type: 'subscription', subscription_type: subscription.type },
          status: { [Op.in]: ['completed', 'verified'] },
        },
        transaction: t,
      });
      if (!payment) {
        logger.warn('No valid payment found for refund', { subscriptionId, transactionId: t.id });
        throw new AppError('No valid payment found for refund', 400, ERROR_CODES.PAYMENT_FAILED);
      }
      await adminRideService.disputePayment(payment.id, { action: 'refund', reason }, { transaction: t });
      subscription.status = SUBSCRIPTION_STATUSES.CANCELED;
      await subscription.save({ transaction: t });
    } else if (action === DISPUTE_ACTIONS.IGNORE) {
      logger.info('Dispute ignored', { subscriptionId, action, reason, transactionId: t.id });
    }

    const customer = await Customer.findByPk(subscription.customer_id, { attributes: ['user_id'], transaction: t });
    if (!customer) {
      logger.warn('Customer not found for socket emission', { subscriptionId, customerId: subscription.customer_id, transactionId: t.id });
    } else {
      socketService.emitToUser(customer.user_id, 'subscription:updated', {
        subscriptionId,
        status: subscription.status,
        dispute: { action, reason },
      });
    }

    logger.info('Subscription dispute handled', { subscriptionId, action, transactionId: t.id });
    return { subscriptionId, action, reason };
  });
};

module.exports = { getSubscriptionDetails, updateSubscriptionStatus, handleSubscriptionDispute };