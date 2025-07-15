'use strict';

const { Op } = require('sequelize');
const { Subscription, Customer, User, Wallet, Payment, WalletTransaction, MenuInventory, ProductCategory, Merchant } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const munchConstants = require('@constants/common/munchConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const merchantConstantsMap = {
  restaurant: restaurantConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function getMerchantConstants(serviceType) {
  const constants = merchantConstantsMap[serviceType];
  if (!constants) {
    throw new AppError('Invalid merchant type', 400, 'INVALID_MERCHANT_TYPE');
  }
  return constants;
}

async function validateMenuItemForSubscription(customerId, menuItemId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const menuItem = await MenuInventory.findByPk(menuItemId, {
    include: [
      { model: ProductCategory, as: 'category' },
      { model: Merchant, as: 'merchant' },
    ],
    transaction,
  });
  if (!menuItem || !menuItem.is_published) {
    throw new AppError('Invalid or unpublished menu item', 404, 'INVALID_MENU_ITEM');
  }

  const merchantConstants = await getMerchantConstants(menuItem.merchant.type);
  const allowedDietaryFilters = merchantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS;
  const dietaryTags = menuItem.tags || [];
  const isDietaryCompliant = dietaryTags.some(tag => allowedDietaryFilters.includes(tag));

  if (!isDietaryCompliant) {
    throw new AppError('Menu item does not meet dietary requirements', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
  }

  return { menuItem, merchantConstants };
}

async function enrollSubscription(customerId, planId, serviceType = 'munch', menuItemId = null, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const subscriptionConstants = customerConstants.SUBSCRIPTION_CONSTANTS;
  const planDetails = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === planId);
  if (!planDetails) {
    throw new AppError('Invalid subscription plan', 400, munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN);
  }

  const merchantConstants = await getMerchantConstants(serviceType);
  const maxActiveSubscriptions = subscriptionConstants.MAX_ACTIVE_SUBSCRIPTIONS;
  const activeSubscriptions = await Subscription.count({
    where: { customer_id: customer.id, status: 'active' },
    transaction,
  });
  if (activeSubscriptions >= maxActiveSubscriptions) {
    throw new AppError('Maximum active subscriptions exceeded', 400, 'MAX_SUBSCRIPTIONS_EXCEEDED');
  }

  let menuItem = null;
  if (menuItemId) {
    ({ menuItem } = await validateMenuItemForSubscription(customerId, menuItemId, transaction));
  }

  const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const dynamicPrice = planDetails.price === 'dynamic' && menuItem
    ? menuItem.calculateFinalPrice()
    : parseFloat(planDetails.price) || 10.00;
  if (wallet.balance < dynamicPrice) {
    throw new AppError('Insufficient wallet balance', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
  }

  if (wallet.balance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
    throw new AppError('Wallet balance exceeds maximum limit', 400, paymentConstants.ERROR_CODES.TRANSACTION_LIMIT_EXCEEDED);
  }

  const subscription = await Subscription.create({
    customer_id: customer.id,
    plan: planDetails.name,
    service_type: serviceType,
    status: subscriptionConstants.SUBSCRIPTION_STATUSES[0], // active
    total_amount: dynamicPrice,
    sharing_enabled: planDetails.benefits.includes('social_sharing'),
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + planDetails.durationDays)),
    menu_item_id: menuItemId,
  }, { transaction });

  const walletTransaction = await WalletTransaction.create({
    wallet_id: wallet.id,
    type: paymentConstants.TRANSACTION_TYPES.find(t => t === 'SUBSCRIPTION_PAYMENT') || 'DEPOSIT',
    amount: dynamicPrice,
    currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[customer.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
    status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
    description: `Subscription enrollment: ${planDetails.name} for ${serviceType}`,
  }, { transaction });

  await wallet.update({
    balance: wallet.balance - dynamicPrice,
  }, { transaction });

  const payment = await Payment.create({
    customer_id: customer.id,
    amount: dynamicPrice,
    payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[2], // digital_wallet
    status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
    transaction_id: walletTransaction.id.toString(),
    provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
    payment_details: { wallet_transaction_id: walletTransaction.id, subscription_id: subscription.id },
  }, { transaction });

  await subscription.update({ payment_id: payment.id }, { transaction });

  logger.info('Subscription enrolled', {
    customerId,
    subscriptionId: subscription.id,
    plan: planDetails.name,
    serviceType,
    menuItemId,
  });

  return {
    subscription,
    wallet,
    payment,
    walletTransaction,
    amount: dynamicPrice,
    currency: wallet.currency,
    benefits: planDetails.benefits,
  };
}

async function manageSubscription(customerId, action, options = {}, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const subscription = await Subscription.findOne({
    where: { customer_id: customer.id, status: { [Op.in]: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES } },
    include: [{ model: Payment, as: 'payment' }],
    transaction,
  });
  if (!subscription) {
    throw new AppError('Subscription not found', 404, munchConstants.ERROR_CODES.SUBSCRIPTION_NOT_FOUND);
  }

  const subscriptionConstants = customerConstants.SUBSCRIPTION_CONSTANTS;
  const validActions = ['UPGRADE', 'DOWNGRADE', 'PAUSE', 'CANCEL'];
  if (!validActions.includes(action)) {
    throw new AppError('Invalid subscription action', 400, munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_ACTION);
  }

  let result = {
    subscription,
    wallet: null,
    payment: null,
    walletTransaction: null,
    amount: 0,
    refundAmount: 0,
    newStatus: subscription.status,
    benefits: subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan).benefits,
  };

  const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const merchantConstants = await getMerchantConstants(subscription.service_type);

  if (action === 'UPGRADE') {
    const { newPlanId, menuItemId } = options;
    const newPlan = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === newPlanId);
    if (!newPlan) {
      throw new AppError('Invalid subscription plan', 400, munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN);
    }

    const currentPlan = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan);
    let newPrice = parseFloat(newPlan.price) || 10.00;
    if (newPlan.price === 'dynamic' && menuItemId) {
      const { menuItem } = await validateMenuItemForSubscription(customerId, menuItemId, transaction);
      newPrice = menuItem.calculateFinalPrice();
    }

    if (newPrice <= parseFloat(currentPlan.price || 0)) {
      throw new AppError('Invalid upgrade plan', 400, munchConstants.ERROR_CODES.INVALID_UPGRADE_PLAN);
    }

    if (wallet.balance < newPrice) {
      throw new AppError('Insufficient wallet balance', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
    }

    const walletTransaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.find(t => t === 'SUBSCRIPTION_UPGRADE') || 'DEPOSIT',
      amount: newPrice,
      currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[customer.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
      status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
      description: `Subscription upgrade to ${newPlan.name}`,
    }, { transaction });

    await wallet.update({
      balance: wallet.balance - newPrice,
    }, { transaction });

    const payment = await Payment.create({
      customer_id: customer.id,
      amount: newPrice,
      payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[2], // digital_wallet
      status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
      transaction_id: walletTransaction.id.toString(),
      provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
      payment_details: { wallet_transaction_id: walletTransaction.id, subscription_id: subscription.id },
    }, { transaction });

    await subscription.update({
      plan: newPlan.name,
      total_amount: newPrice,
      service_type: subscription.service_type,
      sharing_enabled: newPlan.benefits.includes('social_sharing'),
      end_date: new Date(new Date().setDate(new Date().getDate() + newPlan.durationDays)),
      payment_id: payment.id,
      menu_item_id: menuItemId || subscription.menu_item_id,
    }, { transaction });

    result = { ...result, wallet, payment, walletTransaction, amount: newPrice, newPlanId, benefits: newPlan.benefits };
  } else if (action === 'DOWNGRADE') {
    const { newPlanId } = options;
    const newPlan = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === newPlanId);
    if (!newPlan) {
      throw new AppError('Invalid subscription plan', 400, munchConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN);
    }

    const currentPlan = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan);
    const newPrice = parseFloat(newPlan.price) || 5.00;
    if (newPrice >= parseFloat(currentPlan.price || 0)) {
      throw new AppError('Invalid downgrade plan', 400, munchConstants.ERROR_CODES.INVALID_DOWNGRADE_PLAN);
    }

    await subscription.update({
      plan: newPlan.name,
      total_amount: newPrice,
      service_type: subscription.service_type,
      sharing_enabled: newPlan.benefits.includes('social_sharing'),
      end_date: new Date(new Date().setDate(new Date().getDate() + newPlan.durationDays)),
    }, { transaction });

    result = { ...result, newPlanId, benefits: newPlan.benefits };
  } else if (action === 'PAUSE') {
    const { pauseDurationDays } = options;
    if (!pauseDurationDays || pauseDurationDays > 30) {
      throw new AppError('Invalid pause duration', 400, munchConstants.ERROR_CODES.INVALID_PAUSE_DURATION);
    }
    const resumeDate = new Date(new Date().setDate(new Date().getDate() + pauseDurationDays));
    await subscription.update({
      status: subscriptionConstants.SUBSCRIPTION_STATUSES[1], // paused
      end_date: resumeDate,
    }, { transaction });
    result.newStatus = subscriptionConstants.SUBSCRIPTION_STATUSES[1];
  } else if (action === 'CANCEL') {
    const currentPlan = subscriptionConstants.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan);
    const startDate = new Date(subscription.start_date);
    const now = new Date();
    const daysUsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const prorationFactor = Math.max(0, (currentPlan.durationDays - daysUsed) / currentPlan.durationDays);
    const refundAmount = prorationFactor * subscription.total_amount;

    if (refundAmount > 0) {
      const walletTransaction = await WalletTransaction.create({
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.find(t => t === 'REFUND') || 'REFUND',
        amount: refundAmount,
        currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[customer.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
        status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
        description: `Subscription cancellation refund for ${currentPlan.name}`,
      }, { transaction });

      await wallet.update({
        balance: wallet.balance + refundAmount,
      }, { transaction });

      const payment = await Payment.create({
        customer_id: customer.id,
        amount: refundAmount,
        payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[2], // digital_wallet
        status: paymentConstants.TRANSACTION_STATUSES[4], // REFUNDED
        transaction_id: walletTransaction.id.toString(),
        provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
        payment_details: { wallet_transaction_id: walletTransaction.id, subscription_id: subscription.id },
        refund_status: 'processed',
        refund_details: { reason: 'Subscription cancellation', timestamp: new Date() },
      }, { transaction });

      result = { ...result, wallet, payment, walletTransaction, refundAmount };
    }

    await subscription.update({
      status: subscriptionConstants.SUBSCRIPTION_STATUSES[2], // cancelled
      end_date: new Date(),
    }, { transaction });
    result.newStatus = subscriptionConstants.SUBSCRIPTION_STATUSES[2];
  }

  logger.info('Subscription action performed', {
    customerId,
    subscriptionId: subscription.id,
    action,
    newStatus: result.newStatus,
    serviceType: subscription.service_type,
  });

  return result;
}

async function trackSubscriptionTiers(customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const subscription = await Subscription.findOne({
    where: { customer_id: customer.id, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] },
    include: [{ model: Payment, as: 'payment' }, { model: MenuInventory, as: 'menuItem' }],
    transaction,
  });
  if (!subscription) {
    throw new AppError('Subscription not found', 404, munchConstants.ERROR_CODES.SUBSCRIPTION_NOT_FOUND);
  }

  const planDetails = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan);
  logger.info('Subscription tier tracked', {
    customerId,
    subscriptionId: subscription.id,
    plan: subscription.plan,
    serviceType: subscription.service_type,
  });

  return {
    subscriptionId: subscription.id,
    plan: subscription.plan,
    service_type: subscription.service_type,
    status: subscription.status,
    total_amount: subscription.total_amount,
    sharing_enabled: subscription.sharing_enabled,
    endDate: subscription.end_date,
    benefits: planDetails.benefits,
    menuItem: subscription.menuItem ? { id: subscription.menuItem.id, name: subscription.menuItem.name } : null,
  };
}

async function renewSubscription(subscriptionId, transaction) {
  const subscription = await Subscription.findOne({
    where: { id: subscriptionId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] },
    include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] }, { model: MenuInventory, as: 'menuItem' }],
    transaction,
  });
  if (!subscription) {
    throw new AppError('Subscription not found', 404, munchConstants.ERROR_CODES.SUBSCRIPTION_NOT_FOUND);
  }

  const planDetails = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(plan => plan.name === subscription.plan);
  const merchantConstants = await getMerchantConstants(subscription.service_type);
  let renewalPrice = parseFloat(planDetails.price) || 10.00;
  if (planDetails.price === 'dynamic' && subscription.menu_item_id) {
    const { menuItem } = await validateMenuItemForSubscription(subscription.customer.user_id, subscription.menu_item_id, transaction);
    renewalPrice = menuItem.calculateFinalPrice();
  }

  const wallet = await Wallet.findOne({ where: { user_id: subscription.customer.user_id }, transaction });
  if (!wallet || wallet.balance < renewalPrice) {
    throw new AppError('Insufficient wallet balance', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
  }

  const walletTransaction = await WalletTransaction.create({
    wallet_id: wallet.id,
    type: paymentConstants.TRANSACTION_TYPES.find(t => t === 'SUBSCRIPTION_RENEWAL') || 'DEPOSIT',
    amount: renewalPrice,
    currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[subscription.customer.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
    status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
    description: `Subscription renewal: ${planDetails.name} for ${subscription.service_type}`,
  }, { transaction });

  await wallet.update({
    balance: wallet.balance - renewalPrice,
  }, { transaction });

  const payment = await Payment.create({
    customer_id: subscription.customer_id,
    amount: renewalPrice,
    payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[2], // digital_wallet
    status: paymentConstants.TRANSACTION_STATUSES[1], // COMPLETED
    transaction_id: walletTransaction.id.toString(),
    provider: paymentConstants.SECURITY_CONSTANTS.TOKENIZATION_PROVIDER,
    payment_details: { wallet_transaction_id: walletTransaction.id, subscription_id: subscription.id },
  }, { transaction });

  await subscription.update({
    payment_id: payment.id,
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + planDetails.durationDays)),
  }, { transaction });

  logger.info('Subscription renewed', {
    subscriptionId,
    customerId: subscription.customer.user_id,
    plan: subscription.plan,
    serviceType: subscription.service_type,
  });

  return {
    subscription,
    wallet,
    payment,
    walletTransaction,
    amount: renewalPrice,
    benefits: planDetails.benefits,
  };
}

module.exports = { enrollSubscription, manageSubscription, trackSubscriptionTiers, renewSubscription };