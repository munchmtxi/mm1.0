'use strict';

const { Subscription, Customer } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('sequelize');

async function enrollSubscription(customerId, planId, serviceType, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!['mtxi', 'munch', 'mtables'].includes(serviceType)) {
    throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES[0]);
  }

  if (!['BASIC', 'PREMIUM'].includes(planId)) {
    throw new AppError('Invalid plan', 400, customerConstants.ERROR_CODES[0]);
  }

  const activeSubscriptions = await Subscription.count({
    where: { customer_id: customerId, status: 'active' },
    transaction,
  });
  if (activeSubscriptions >= customerConstants.SUBSCRIPTION_CONSTANTS.MAX_ACTIVE_SUBSCRIPTIONS) {
    throw new AppError('Max subscriptions exceeded', 400, customerConstants.ERROR_CODES[2]);
  }

  const plan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS[planId];
  const paymentAmount = plan.amount || (serviceType === 'mtxi' ? 10 : 15);

  const subscription = await Subscription.create(
    {
      customer_id: customerId,
      service_type: serviceType,
      plan: planId,
      status: 'active',
      start_date: new Date(),
      end_date: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
      total_amount: paymentAmount,
      sharing_enabled: planId === 'PREMIUM',
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Subscription enrolled', { subscriptionId: subscription.id, customerId, serviceType });
  return subscription;
}

async function manageSubscription(customerId, subscriptionId, action, newPlanId, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  const subscription = await Subscription.findOne({
    where: { id: subscriptionId, customer_id: customerId, status: 'active' },
    transaction,
  });
  if (!subscription) throw new AppError('Active subscription not found', 404, customerConstants.ERROR_CODES[3]);

  if (action === 'UPGRADE') {
    if (!['BASIC', 'PREMIUM'].includes(newPlanId)) {
      throw new AppError('Invalid plan', 400, customerConstants.ERROR_CODES[0]);
    }
    if (newPlanId === subscription.plan) {
      throw new AppError('Same plan selected', 400, customerConstants.ERROR_CODES[0]);
    }

    const newPlan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS[newPlanId];
    const paymentAmount = newPlan.amount || (subscription.service_type === 'mtxi' ? 15 : 20);

    await subscription.update(
      {
        plan: newPlanId,
        end_date: new Date(Date.now() + newPlan.durationDays * 24 * 60 * 60 * 1000),
        total_amount: paymentAmount,
        sharing_enabled: newPlanId === 'PREMIUM',
        updated_at: new Date(),
      },
      { transaction }
    );
  } else if (action === 'PAUSE') {
    if (subscription.status === 'paused') {
      throw new AppError('Subscription already paused', 400, customerConstants.ERROR_CODES[4]);
    }
    await subscription.update(
      {
        status: 'paused',
        updated_at: new Date(),
      },
      { transaction }
    );
  } else {
    throw new AppError('Invalid action', 400, customerConstants.ERROR_CODES[0]);
  }

  logger.info('Subscription managed', { subscriptionId, action });
  return subscription;
}

async function cancelSubscription(customerId, subscriptionId, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  const subscription = await Subscription.findOne({
    where: { id: subscriptionId, customer_id: customerId, status: ['active', 'paused'] },
    transaction,
  });
  if (!subscription) throw new AppError('Subscription not found or not cancellable', 404, customerConstants.ERROR_CODES[3]);

  await subscription.update(
    {
      status: 'cancelled',
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Subscription cancelled', { subscriptionId, customerId });
  return subscription;
}

async function trackSubscriptionTiers(customerId, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  const subscription = await Subscription.findOne({
    where: { customer_id: customerId, status: 'active' },
    transaction,
  });

  const tierDetails = {
    customerId,
    subscriptionId: subscription?.id || null,
    serviceType: subscription?.service_type || null,
    plan: subscription?.plan || null,
    tier: null,
    benefits: [],
    sharingEnabled: false,
  };

  if (subscription) {
    const plan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS[subscription.plan];
    tierDetails.tier = customerConstants.PROMOTION_CONSTANTS.LOYALTY_TIERS[subscription.plan === 'PREMIUM' ? 'GOLD' : 'BRONZE'].name;
    tierDetails.benefits = plan.benefits || [];
    tierDetails.sharingEnabled = subscription.sharing_enabled;
  }

  logger.info('Subscription tiers tracked', { customerId, tier: tierDetails.tier });
  return tierDetails;
}

async function getSubscriptionHistory(customerId, transaction) {
  const subscriptions = await Subscription.findAll({
    where: { customer_id: customerId },
    attributes: ['id', 'service_type', 'plan', 'status', 'start_date', 'end_date'],
    transaction,
  });

  logger.info('Subscription history retrieved', { customerId });
  return subscriptions;
}

module.exports = {
  enrollSubscription,
  manageSubscription,
  cancelSubscription,
  trackSubscriptionTiers,
  getSubscriptionHistory,
};