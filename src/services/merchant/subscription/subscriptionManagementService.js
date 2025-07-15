'use strict';

const { sequelize, Subscription, Customer, User, Merchant } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function createSubscriptionPlan(merchantId, plan, io, auditService, socketService, notificationService, pointService, ipAddress) {
  const { name, price, currency, benefits, durationDays, serviceType, planType, sharingEnabled } = plan;
  const transaction = await sequelize.transaction();

  try {
    if (!merchantConstants.MERCHANT_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError('Invalid currency', 400, merchantConstants.ERROR_CODES[2]); // PAYMENT_FAILED
    }
    if (price <= 0) {
      throw new AppError('Invalid price', 400, merchantConstants.ERROR_CODES[2]);
    }
    if (durationDays <= 0) {
      throw new AppError('Invalid duration', 400, merchantConstants.ERROR_CODES[2]);
    }
    if (!['mtxi', 'munch', 'mtables'].includes(serviceType)) {
      throw new AppError('Invalid service type', 400, merchantConstants.ERROR_CODES[2]);
    }
    if (!['BASIC', 'PREMIUM'].includes(planType)) {
      throw new AppError('Invalid plan type', 400, merchantConstants.ERROR_CODES[2]);
    }

    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
      transaction,
    });
    if (!merchant || !merchant.merchant_profile) {
      throw new AppError('Invalid merchant', 404, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const subscription = await Subscription.create({
      merchant_id: merchantId,
      name,
      total_amount: price,
      currency,
      benefits: JSON.stringify(benefits),
      duration_days: durationDays,
      service_type: serviceType,
      plan: planType,
      sharing_enabled: sharingEnabled || false,
      status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0], // active
    }, { transaction });

    await notificationService.sendNotification({
      userId: merchantId,
      notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_confirmation (used as a placeholder)
      messageKey: 'subscriptionManagement.planCreated',
      messageParams: { name },
      role: 'merchant',
      module: 'subscription',
      languageCode: merchant.preferred_language || merchantConstants.BUSINESS_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);

    await auditService.logAction({
      userId: merchantId,
      role: 'merchant',
      action: 'subscription:created',
      details: { subscriptionId: subscription.id, name, total_amount: price, currency, durationDays, serviceType, planType },
      ipAddress,
    }, transaction);

    socketService.emit(io, 'subscription:planCreated', { subscriptionId: subscription.id, name, merchantId }, `merchant:${merchantId}`);

    await pointService.awardPoints(merchantId, 'subscription_plan_creation', 15, { subscriptionId: subscription.id });

    await transaction.commit();
    logger.info(`Subscription plan ${subscription.id} created for merchant ${merchantId}`);
    return { subscriptionId: subscription.id };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('createSubscriptionPlan', error, merchantConstants.ERROR_CODES[2]);
  }
}

async function trackSubscriptionTiers(customerId, io, auditService, socketService, pointService, ipAddress) {
  try {
    const customer = await User.findByPk(customerId, {
      attributes: ['id'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
    });
    if (!customer || !customer.customer_profile) {
      throw new AppError('Invalid customer', 404, customerConstants.ERROR_CODES[1]); // CUSTOMER_NOT_FOUND
    }

    const subscriptions = await Subscription.findAll({
      where: { customer_id: customerId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] }, // active
      attributes: ['id', 'name', 'total_amount', 'currency', 'start_date', 'end_date', 'service_type', 'plan'],
    });

    const tiers = subscriptions.map(s => ({
      id: s.id,
      name: s.name,
      price: s.total_amount,
      currency: s.currency,
      startDate: s.start_date,
      endDate: s.end_date,
      serviceType: s.service_type,
      plan: s.plan,
    }));

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'subscription:tracked',
      details: { customerId, tierCount: tiers.length },
      ipAddress,
    });

    socketService.emit(io, 'subscription:tiersTracked', { customerId, tiers }, `customer:${customerId}`);

    await pointService.awardPoints(customerId, 'subscription_tier_tracking', 10 * tiers.length, { tierCount: tiers.length });

    logger.info(`Tracked ${tiers.length} subscription tiers for customer ${customerId}`);
    return { customerId, tiers };
  } catch (error) {
    throw handleServiceError('trackSubscriptionTiers', error, customerConstants.ERROR_CODES[4]); // PAYMENT_FAILED
  }
}

async function manageSubscriptions(customerId, action, io, auditService, socketService, notificationService, pointService, ipAddress) {
  const { subscriptionId, operation } = action;
  const transaction = await sequelize.transaction();

  try {
    const customer = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (!customer || !customer.customer_profile) {
      throw new AppError('Invalid customer', 404, customerConstants.ERROR_CODES[1]); // CUSTOMER_NOT_FOUND
    }

    const subscription = await Subscription.findByPk(subscriptionId, { transaction });
    if (!subscription) {
      throw new AppError('Subscription not found', 404, customerConstants.ERROR_CODES[4]); // PAYMENT_FAILED
    }

    const now = new Date();
    let updates = {};
    if (operation === 'enroll') {
      if (subscription.customer_id) {
        throw new AppError('Subscription already active', 400, customerConstants.ERROR_CODES[5]); // SUBSCRIPTION_ALREADY_ACTIVE
      }
      const activeSubscriptions = await Subscription.count({
        where: { customer_id: customerId, status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] }, // active
        transaction,
      });
      if (activeSubscriptions >= customerConstants.SUBSCRIPTION_CONSTANTS.MAX_ACTIVE_SUBSCRIPTIONS) {
        throw new AppError('Max subscriptions reached', 400, customerConstants.ERROR_CODES[4]);
      }
      updates = {
        customer_id: customerId,
        status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0], // active
        start_date: now,
        end_date: new Date(now.setDate(now.getDate() + subscription.duration_days)),
      };
    } else if (operation === 'upgrade') {
      if (subscription.customer_id !== customerId) {
        throw new AppError('Unauthorized subscription', 403, customerConstants.ERROR_CODES[2]); // PERMISSION_DENIED
      }
      updates = {
        status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0], // active
        end_date: new Date(now.setDate(now.getDate() + subscription.duration_days)),
      };
    } else if (operation === 'cancel') {
      updates = {
        status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[2], // cancelled
        end_date: now,
      };
    } else {
      throw new AppError('Invalid operation', 400, customerConstants.ERROR_CODES[4]);
    }

    await subscription.update(updates, { transaction });

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // booking_confirmation (used as a placeholder)
      messageKey: 'subscriptionManagement.subscriptionManaged',
      messageParams: { operation, subscriptionName: subscription.name },
      role: 'customer',
      module: 'subscription',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'subscription:updated',
      details: { subscriptionId, operation, customerId },
      ipAddress,
    }, transaction);

    socketService.emit(io, 'subscription:managed', { customerId, subscriptionId, operation }, `customer:${customerId}`);

    await pointService.awardPoints(customerId, 'subscription_management', 15, { subscriptionId, operation });

    await transaction.commit();
    logger.info(`Subscription ${subscriptionId} ${operation} for customer ${customerId}`);
    return { customerId, subscriptionId, operation };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('manageSubscriptions', error, customerConstants.ERROR_CODES[4]);
  }
}

module.exports = {
  createSubscriptionPlan,
  trackSubscriptionTiers,
  manageSubscriptions,
};