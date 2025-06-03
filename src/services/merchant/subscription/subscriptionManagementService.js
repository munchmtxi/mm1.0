// src/services/merchant/subscription/subscriptionManagementService.js
'use strict';

const { sequelize, Subscription, Customer, User, Order, Booking } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const munchConstants = require('@constants/munchConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class SubscriptionManagementService {
  static async createSubscriptionPlan(merchantId, plan, ipAddress) {
    const { name, price, currency, benefits, durationDays } = plan;
    const transaction = await sequelize.transaction();

    try {
      if (!merchantConstants.BRANCH_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidCurrency'), 400, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
      }
      if (price <= 0) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidPrice'), 400, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
      }
      if (durationDays <= 0) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidDuration'), 400, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const subscription = await Subscription.create({
        merchant_id: merchantId,
        name,
        price,
        currency,
        benefits: JSON.stringify(benefits),
        duration_days: durationDays,
        status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.BASIC.status || 'active',
      }, { transaction });

      const message = formatMessage(merchant.preferred_language, 'subscriptionManagement.planCreated', { name });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
        subscriptionId: subscription.id,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { subscriptionId: subscription.id, name, price, currency, durationDays },
        ipAddress,
      }, transaction);

      socketService.emit(`subscription:planCreated:${merchantId}`, { subscriptionId: subscription.id, name, merchantId });

      await transaction.commit();
      logger.info(`Subscription plan ${subscription.id} created for merchant ${merchantId}`);
      return { subscriptionId: subscription.id };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('createSubscriptionPlan', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async trackSubscriptionTiers(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const subscriptions = await Subscription.findAll({
        where: { customer_id: customerId, status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES.ACTIVE },
        attributes: ['id', 'name', 'price', 'currency', 'start_date', 'end_date'],
      });

      const tiers = subscriptions.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        currency: s.currency,
        startDate: s.start_date,
        endDate: s.end_date,
      }));

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, tierCount: tiers.length },
        ipAddress,
      });

      socketService.emit(`subscription:tiersTracked:${customerId}`, { customerId, tiers });

      logger.info(`Tracked ${tiers.length} subscription tiers for customer ${customerId}`);
      return { customerId, tiers };
    } catch (error) {
      throw handleServiceError('trackSubscriptionTiers', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async manageSubscriptions(customerId, action, ipAddress) {
    const { subscriptionId, operation } = action;
    const transaction = await sequelize.transaction();

    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const subscription = await Subscription.findByPk(subscriptionId, { transaction });
      if (!subscription) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.subscriptionNotFound'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const now = new Date();
      let updates = {};
      if (operation === 'enroll') {
        if (subscription.customer_id) {
          throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.subscriptionAlreadyActive'), 400, munchConstants.ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE);
        }
        updates = {
          customer_id: customerId,
          status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES.ACTIVE,
          start_date: now,
          end_date: new Date(now.setDate(now.getDate() + subscription.duration_days)),
        };
      } else if (operation === 'upgrade') {
        if (subscription.customer_id !== customerId) {
          throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.unauthorizedSubscription'), 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
        }
        updates = {
          status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES.ACTIVE,
          end_date: new Date(now.setDate(now.getDate() + subscription.duration_days)),
        };
      } else if (operation === 'cancel') {
        updates = {
          status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES.CANCELLED,
          end_date: now,
        };
      } else {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidOperation'), 400, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      await subscription.update(updates, { transaction });

      const message = formatMessage(customer.preferred_language, 'subscriptionManagement.subscriptionManaged', {
        operation,
        subscriptionName: subscription.name,
      });
      await notificationService.createNotification({
        userId: customerId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language,
        subscriptionId: subscription.id,
      }, transaction);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { subscriptionId, operation, customerId },
        ipAddress,
      }, transaction);

      socketService.emit(`subscription:managed:${customerId}`, { customerId, subscriptionId, operation });

      await transaction.commit();
      logger.info(`Subscription ${subscriptionId} ${operation} for customer ${customerId}`);
      return { customerId, subscriptionId, operation };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('manageSubscriptions', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async trackSubscriptionGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'subscriptions', 'en', 'subscriptionManagement.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const subscriptions = await Subscription.findAll({
        where: { customer_id: customerId, status: merchantConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES.ACTIVE },
      });
      const orders = await Order.findAll({
        where: { customer_id: customerId, subscription_id: subscriptions.map(s => s.id) },
        include: [{ model: Customer, as: 'customer' }],
      });
      const bookings = await Booking.findAll({
        where: { customer_id: customerId },
        include: [{ model: Customer, as: 'customer' }],
      });

      const points = (subscriptions.length * merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUBSCRIPTION_LOYALTY.points) +
                    (orders.length * munchConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.ORDER_PLACED.points) +
                    (bookings.length * merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.CHECK_IN.points);

      await gamificationService.awardPoints({
        userId: customerId,
        action: merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUBSCRIPTION_LOYALTY.action,
        points,
        metadata: { subscriptionCount: subscriptions.length, orderCount: orders.length, bookingCount: bookings.length },
      });

      const message = formatMessage(customer.preferred_language, 'subscriptionManagement.pointsAwarded', { points });
      await notificationService.createNotification({
        userId: customerId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, pointsAwarded: points, subscriptionCount: subscriptions.length },
        ipAddress,
      });

      socketService.emit(`subscription:gamification:${customerId}`, { customerId, points });

      logger.info(`Gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackSubscriptionGamification', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }
}

module.exports = SubscriptionManagementService;