'use strict';

const { Op } = require('sequelize');
const { Subscription, Customer, User, Wallet, Payment } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function enrollSubscription(customerId, planId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  if (!munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[planId]) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_subscription_plan'),
      400,
      munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN
    );
  }

  const existingSubscription = await Subscription.findOne({
    where: { customer_id: customer.id, status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[0] },
    transaction,
  });
  if (existingSubscription) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.subscription_already_active'),
      400,
      munchConstants.ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE
    );
  }

  const planDetails = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[planId];
  const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!wallet || wallet.balance < planDetails.price) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.insufficient_funds'),
      400,
      munchConstants.ERROR_CODES.INSUFFICIENT_FUNDS
    );
  }

  const subscription = await Subscription.create({
    customer_id: customer.id,
    plan_id: planId,
    status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[0],
    tier: planDetails.tier,
    billing_cycle: planDetails.billing_cycle,
    start_date: new Date(),
    end_date: new Date(new Date().setMonth(new Date().getMonth() + (planDetails.billing_cycle === 'monthly' ? 1 : 12))),
  }, { transaction });

  return { subscription, wallet, amount: planDetails.price, currency: munchConstants.PAYMENT_CONSTANTS.DEFAULT_CURRENCY };
}

async function manageSubscription(customerId, action, options = {}, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const subscription = await Subscription.findOne({
    where: { customer_id: customer.id, status: { [Op.in]: [munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[0], munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[1]] } },
    transaction,
  });
  if (!subscription) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.subscription_not_found'),
      404,
      munchConstants.ERROR_CODES.SUBSCRIPTION_NOT_FOUND
    );
  }

  if (!munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS.includes(action)) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_subscription_action'),
      400,
      munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_ACTION
    );
  }

  let result = { subscription, wallet: null, amount: 0, refundAmount: 0, newStatus: subscription.status };

  if (action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[0]) { // UPGRADE
    const { newPlanId } = options;
    if (!newPlanId || !munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[newPlanId]) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_subscription_plan'),
        400,
        munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN
      );
    }
    const currentPlan = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[subscription.plan_id];
    const newPlan = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[newPlanId];
    if (newPlan.tier <= currentPlan.tier) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_upgrade_plan'),
        400,
        munchConstants.ERROR_CODES.INVALID_UPGRADE_PLAN
      );
    }

    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet || wallet.balance < newPlan.price) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.insufficient_funds'),
        400,
        munchConstants.ERROR_CODES.INSUFFICIENT_FUNDS
      );
    }

    await subscription.update({
      plan_id: newPlanId,
      tier: newPlan.tier,
      billing_cycle: newPlan.billing_cycle,
      end_date: new Date(new Date().setMonth(new Date().getMonth() + (newPlan.billing_cycle === 'monthly' ? 1 : 12))),
    }, { transaction });

    result = { ...result, wallet, amount: newPlan.price, newPlanId };
  } else if (action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[1]) { // DOWNGRADE
    const { newPlanId } = options;
    if (!newPlanId || !munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[newPlanId]) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_subscription_plan'),
        400,
        munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN
      );
    }
    const currentPlan = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[subscription.plan_id];
    const newPlan = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[newPlanId];
    if (newPlan.tier >= currentPlan.tier) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_downgrade_plan'),
        400,
        munchConstants.ERROR_CODES.INVALID_DOWNGRADE_PLAN
      );
    }

    await subscription.update({
      plan_id: newPlanId,
      tier: newPlan.tier,
      billing_cycle: newPlan.billing_cycle,
      end_date: new Date(new Date().setMonth(new Date().getMonth() + (newPlan.billing_cycle === 'monthly' ? 1 : 12))),
    }, { transaction });

    result = { ...result, newPlanId };
  } else if (action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[2]) { // PAUSE
    const { pauseDurationDays } = options;
    if (!pauseDurationDays || pauseDurationDays > munchConstants.SUBSCRIPTION_CONSTANTS.MAX_PAUSE_DAYS) {
      throw new AppError(
        formatMessage('customer', 'munch', customer.user.preferred_language, 'error.invalid_pause_duration'),
        400,
        munchConstants.ERROR_CODES.INVALID_PAUSE_DURATION
      );
    }
    const resumeDate = new Date(new Date().setDate(new Date().getDate() + pauseDurationDays));
    await subscription.update({
      status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[1],
      pause_end_date: resumeDate,
    }, { transaction });
    result.newStatus = munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[1];
  } else if (action === munchConstants.SUBSCRIPTION_CONSTANTS.ACTIONS[3]) { // CANCEL
    const currentPlan = munchConstants.SUBSCRIPTION_CONSTANTS.PLANS[subscription.plan_id];
    const startDate = new Date(subscription.start_date);
    const now = new Date();
    const daysUsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const billingDays = subscription.billing_cycle === 'monthly' ? 30 : 365;
    const prorationFactor = Math.max(0, (billingDays - daysUsed) / billingDays);
    const refundAmount = prorationFactor * currentPlan.price;

    if (refundAmount > 0) {
      const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
      if (!wallet) {
        throw new AppError(
          formatMessage('customer', 'munch', customer.user.preferred_language, 'error.wallet_not_found'),
          404,
          munchConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
      }
      result = { ...result, wallet, refundAmount };
    }

    await subscription.update({
      status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[2],
      end_date: new Date(),
    }, { transaction });
    result.newStatus = munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[2];
  }

  return result;
}

async function trackSubscriptionTiers(customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      munchConstants.ERROR_CODES.CUSTOMER_NOT_FOUND
    );
  }

  const subscription = await Subscription.findOne({
    where: { customer_id: customer.id, status: munchConstants.SUBSCRIPTION_CONSTANTS.STATUSES[0] },
    transaction,
  });
  if (!subscription) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.preferred_language, 'error.subscription_not_found'),
      404,
      munchConstants.ERROR_CODES.SUBSCRIPTION_NOT_FOUND
    );
  }

  logger.info('Subscription tier tracked', { customerId, subscriptionId: subscription.id });
  return {
    subscriptionId: subscription.id,
    planId: subscription.plan_id,
    tier: subscription.tier,
    status: subscription.status,
    endDate: subscription.end_date,
  };
}

module.exports = { enrollSubscription, manageSubscription, trackSubscriptionTiers };