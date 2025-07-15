'use strict';

const { Subscription, Customer } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function enrollSubscription(customerId, planId, serviceType, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes(serviceType)) {
    throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES[0]);
  }

  if (!customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.some(plan => plan.name === planId)) {
    throw new AppError('Invalid plan', 400, customerConstants.ERROR_CODES[0]);
  }

  const activeSubscriptions = await Subscription.count({
    where: { customer_id: customerId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] },
    transaction,
  });
  if (activeSubscriptions >= customerConstants.SUBSCRIPTION_CONSTANTS.MAX_ACTIVE_SUBSCRIPTIONS) {
    throw new AppError('Max subscriptions exceeded', 400, customerConstants.ERROR_CODES[0]);
  }

  const plan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(p => p.name === planId);
  const paymentAmount = plan.price === 'dynamic'
    ? customerConstants.SUBSCRIPTION_CONSTANTS.DYNAMIC_PRICING[serviceType] || 10
    : plan.price;

  const subscription = await Subscription.create(
    {
      customer_id: customerId,
      service_type: serviceType,
      plan: planId,
      status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0],
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
    where: { id: subscriptionId, customer_id: customerId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] },
    transaction,
  });
  if (!subscription) throw new AppError('Active subscription not found', 404, customerConstants.ERROR_CODES[0]);

  if (action === 'UPGRADE') {
    if (!customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.some(plan => plan.name === newPlanId)) {
      throw new AppError('Invalid plan', 400, customerConstants.ERROR_CODES[0]);
    }
    if (newPlanId === subscription.plan) {
      throw new AppError('Same plan selected', 400, customerConstants.ERROR_CODES[0]);
    }

    const newPlan = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(p => p.name === newPlanId);
    const paymentAmount = newPlan.price === 'dynamic'
      ? customerConstants.SUBSCRIPTION_CONSTANTS.DYNAMIC_PRICING[subscription.service_type] || 15
      : newPlan.price;

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
    if (subscription.status === customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[1]) {
      throw new AppError('Subscription already paused', 400, customerConstants.ERROR_CODES[0]);
    }
    await subscription.update(
      {
        status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[1],
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
    where: {
      id: subscriptionId,
      customer_id: customerId,
      status: [
        customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0],
        customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[1],
      ],
    },
    transaction,
  });
  if (!subscription) throw new AppError('Subscription not found or not cancellable', 404, customerConstants.ERROR_CODES[0]);

  await subscription.update(
    {
      status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[2],
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
    where: { customer_id: customerId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] },
    transaction,
  });

  const tierDetails = {
    customerId,
    subscriptionId: subscription?.id || null,
    serviceType: subscription?.service_type || null,
    plan: subscription?.plan || null,
    tier: subscription ? (subscription.plan === 'PREMIUM' ? 'SILVER' : 'BRONZE') : null,
    benefits: subscription ? customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(p => p.name === subscription.plan)?.benefits || [] : [],
    sharingEnabled: subscription?.sharing_enabled || false,
  };

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