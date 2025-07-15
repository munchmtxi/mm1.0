'use strict';

const { Op } = require('sequelize');
const { Subscription, Customer, User, Wallet, Payment, WalletTransaction, MenuInventory, ProductCategory, Merchant } = require('@models');
const subscriptionService = require('@services/customer/subscriptionService');
const pointService = require('@services/common/pointService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const munchConstants = require('@constants/common/munchConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const gamificationConstants = require('@constants/customer/customerGamificationConstants');
const { sequelize } = require('@models');

const catchAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  enrollSubscription: catchAsync(async (req, res, next) => {
    const { userId, planId, serviceType = 'munch', menuItemId } = req.body;
    const { languageCode = localizationConstants.DEFAULT_LANGUAGE, io } = req;
    const ipAddress = req.ip;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const result = await subscriptionService.enrollSubscription(userId, planId, serviceType, menuItemId, transaction);

      const actionConfig = gamificationConstants.GAMIFICATION_ACTIONS.munch.find(a => a.action === 'subscription_enrolled');
      if (!actionConfig) throw new AppError('Invalid gamification action', 400, munchConstants.ERROR_CODES.INVALID_ACTION);

      await pointService.awardPoints(userId, 'subscription_enrolled', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: result.wallet.id,
      });

      await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_ENROLLED, {
        userId,
        role: 'customer',
        auditAction: 'SUBSCRIPTION_ENROLLED',
        subscriptionId: result.subscription.id,
        plan: result.subscription.plan,
        amount: result.amount,
        currency: result.currency,
      }, `customer:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('subscription_update') ? 'subscription_update' : 'announcement',
        messageKey: 'subscription.enrolled',
        messageParams: { plan: result.subscription.plan, amount: result.amount, currency: result.currency },
        role: 'customer',
        module: 'subscription',
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        languageCode,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUBSCRIPTION_ENROLLED || 'SUBSCRIPTION_ENROLLED',
        details: { planId, serviceType, menuItemId, subscriptionId: result.subscription.id, amount: result.amount },
        ipAddress,
        metadata: { currency: result.currency },
      }, transaction);

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'subscription.enrolled_success', {
          plan: result.subscription.plan,
          amount: result.amount,
        }),
        data: {
          subscriptionId: result.subscription.id,
          plan: result.subscription.plan,
          serviceType: result.subscription.service_type,
          amount: result.amount,
          currency: result.currency,
          benefits: result.benefits,
          menuItemId: result.subscription.menu_item_id,
        },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Subscription enrollment failed', { error: error.message, userId, planId, serviceType });
      next(new AppError(
        formatMessage('customer', 'subscription', languageCode, `error.${error.errorCode || 'generic'}`, { message: error.message }),
        error.statusCode || 500,
        error.errorCode || munchConstants.ERROR_CODES.SUBSCRIPTION_ENROLLMENT_FAILED || 'SUBSCRIPTION_ENROLLMENT_FAILED'
      ));
    }
  }),

  manageSubscription: catchAsync(async (req, res, next) => {
    const { userId, action, newPlanId, pauseDurationDays, menuItemId } = req.body;
    const { languageCode = localizationConstants.DEFAULT_LANGUAGE, io } = req;
    const ipAddress = req.ip;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const result = await subscriptionService.manageSubscription(userId, action, { newPlanId, pauseDurationDays, menuItemId }, transaction);

      if (['UPGRADE', 'DOWNGRADE', 'PAUSE', 'CANCEL'].includes(action)) {
        const actionConfig = gamificationConstants.GAMIFICATION_ACTIONS.munch.find(a => a.action === 'subscription_managed');
        if (!actionConfig) throw new AppError('Invalid gamification action', 400, munchConstants.ERROR_CODES.INVALID_ACTION);

        await pointService.awardPoints(userId, 'subscription_managed', actionConfig.points, {
          io,
          role: 'customer',
          languageCode,
          walletId: result.wallet?.id,
        });

        await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_UPDATED, {
          userId,
          role: 'customer',
          auditAction: `SUBSCRIPTION_${action}`,
          subscriptionId: result.subscription.id,
          action,
          newStatus: result.newStatus,
          amount: result.amount || 0,
          refundAmount: result.refundAmount || 0,
        }, `customer:${userId}`, languageCode);

        await notificationService.sendNotification({
          userId,
          notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('subscription_update') ? 'subscription_update' : 'announcement',
          messageKey: `subscription.${action.toLowerCase()}_success`,
          messageParams: { plan: result.subscription.plan, amount: result.amount || 0, refundAmount: result.refundAmount || 0 },
          role: 'customer',
          module: 'subscription',
          priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
          languageCode,
        });

        await auditService.logAction({
          userId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[`SUBSCRIPTION_${action}`] || 'SUBSCRIPTION_MANAGED',
          details: { action, newPlanId, pauseDurationDays, menuItemId, subscriptionId: result.subscription.id, amount: result.amount || 0 },
          ipAddress,
          metadata: { refundAmount: result.refundAmount || 0 },
        }, transaction);
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, `subscription.${action.toLowerCase()}_success`, {
          plan: result.subscription.plan,
          amount: result.amount || 0,
        }),
        data: {
          subscriptionId: result.subscription.id,
          plan: result.subscription.plan,
          serviceType: result.subscription.service_type,
          newStatus: result.newStatus,
          amount: result.amount || 0,
          refundAmount: result.refundAmount || 0,
          benefits: result.benefits,
          menuItemId: result.subscription.menu_item_id,
        },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Subscription management failed', { error: error.message, userId, action });
      next(new AppError(
        formatMessage('customer', 'subscription', languageCode, `error.${error.errorCode || 'generic'}`, { message: error.message }),
        error.statusCode || 500,
        error.errorCode || munchConstants.ERROR_CODES.SUBSCRIPTION_MANAGEMENT_FAILED || 'SUBSCRIPTION_MANAGEMENT_FAILED'
      ));
    }
  }),

  trackSubscriptionTiers: catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { languageCode = localizationConstants.DEFAULT_LANGUAGE } = req;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const result = await subscriptionService.trackSubscriptionTiers(userId, transaction);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'subscription.tracked_success'),
        data: {
          subscriptionId: result.subscriptionId,
          plan: result.plan,
          serviceType: result.service_type,
          status: result.status,
          totalAmount: result.total_amount,
          sharingEnabled: result.sharing_enabled,
          endDate: result.endDate,
          benefits: result.benefits,
          menuItem: result.menuItem,
        },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Subscription tracking failed', { error: error.message, userId });
      next(new AppError(
        formatMessage('customer', 'subscription', languageCode, `error.${error.errorCode || 'generic'}`, { message: error.message }),
        error.statusCode || 500,
        error.errorCode || munchConstants.ERROR_CODES.SUBSCRIPTION_TRACKING_FAILED || 'SUBSCRIPTION_TRACKING_FAILED'
      ));
    }
  }),

  renewSubscription: catchAsync(async (req, res, next) => {
    const { subscriptionId } = req.params;
    const { userId, languageCode = localizationConstants.DEFAULT_LANGUAGE, io } = req;
    const ipAddress = req.ip;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const result = await subscriptionService.renewSubscription(subscriptionId, transaction);

      const actionConfig = gamificationConstants.GAMIFICATION_ACTIONS.munch.find(a => a.action === 'subscription_managed');
      if (!actionConfig) throw new AppError('Invalid gamification action', 400, munchConstants.ERROR_CODES.INVALID_ACTION);

      await pointService.awardPoints(userId, 'subscription_managed', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: result.wallet.id,
      });

      await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_RENEWED, {
        userId,
        role: 'customer',
        auditAction: 'SUBSCRIPTION_RENEWED',
        subscriptionId: result.subscription.id,
        plan: result.subscription.plan,
        amount: result.amount,
        currency: result.currency,
      }, `customer:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('subscription_update') ? 'subscription_update' : 'announcement',
        messageKey: 'subscription.renewed_success',
        messageParams: { plan: result.subscription.plan, amount: result.amount, currency: result.currency },
        role: 'customer',
        module: 'subscription',
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        languageCode,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUBSCRIPTION_RENEWED || 'SUBSCRIPTION_RENEWED',
        details: { subscriptionId, plan: result.subscription.plan, amount: result.amount },
        ipAddress,
        metadata: { currency: result.currency },
      }, transaction);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'subscription.renewed_success', {
          plan: result.subscription.plan,
          amount: result.amount,
        }),
        data: {
          subscriptionId: result.subscription.id,
          plan: result.subscription.plan,
          serviceType: result.subscription.service_type,
          amount: result.amount,
          currency: result.currency,
          benefits: result.benefits,
          menuItemId: result.subscription.menu_item_id,
        },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Subscription renewal failed', { error: error.message, subscriptionId, userId });
      next(new AppError(
        formatMessage('customer', 'subscription', languageCode, `error.${error.errorCode || 'generic'}`, { message: error.message }),
        error.statusCode || 500,
        error.errorCode || munchConstants.ERROR_CODES.SUBSCRIPTION_RENEWAL_FAILED || 'SUBSCRIPTION_RENEWAL_FAILED'
      ));
    }
  }),
};