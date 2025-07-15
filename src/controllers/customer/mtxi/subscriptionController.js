'use strict';

const subscriptionService = require('@services/subscriptionService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('@models');

module.exports = {
  async enrollSubscription(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { planId, serviceType } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const subscription = await subscriptionService.enrollSubscription(userId, planId, serviceType, transaction);

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.general.find(a => a.action === 'subscription_enrolled');
      await pointService.awardPoints(userId, 'subscription_enrolled', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.body.walletId,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'subscription.enrolled',
        messageParams: { plan: planId },
        role: 'customer',
        module: 'subscription',
        languageCode,
      });

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_ENROLLED'),
        details: { subscriptionId: subscription.id, planId },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'SUBSCRIPTION_ENROLLED', {
        userId,
        role: 'customer',
        auditAction: 'SUBSCRIPTION_ENROLLED',
        details: { subscriptionId: subscription.id, planId },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(201).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'success.subscription_enrolled', { plan: planId }),
        data: { subscriptionId: subscription.id },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Enroll subscription failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async manageSubscription(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { subscriptionId, action, newPlanId } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const subscription = await subscriptionService.manageSubscription(userId, subscriptionId, action, newPlanId, transaction);

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.general.find(a => a.action === 'subscription_managed');
      await pointService.awardPoints(userId, 'subscription_managed', actionConfig.points, {
        io,
        role: 'customer',
        languageCode,
        walletId: req.body.walletId,
      });

      const auditAction = `SUBSCRIPTION_${action.toUpperCase()}`;
      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === auditAction),
        details: { subscriptionId, action, newPlanId },
        ipAddress: req.ip,
      });

      await socketService.emit(io, auditAction, {
        userId,
        role: 'customer',
        auditAction,
        details: { subscriptionId, action, newPlanId },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, `success.subscription_${action.toLowerCase()}`, { plan: subscription.plan }),
        data: { subscriptionId: subscription.id },
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Manage subscription failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async cancelSubscription(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { subscriptionId } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const subscription = await subscriptionService.cancelSubscription(userId, subscriptionId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_CANCELED'),
        details: { subscriptionId },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'SUBSCRIPTION_CANCELED', {
        userId,
        role: 'customer',
        auditAction: 'SUBSCRIPTION_CANCELED',
        details: { subscriptionId },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'success.subscription_canceled'),
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Cancel subscription failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async trackSubscriptionTiers(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role } = req;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const tierDetails = await subscriptionService.trackSubscriptionTiers(userId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_VIEWED'),
        details: { userId, tier: tierDetails.tier },
        ipAddress: req.ip,
      });

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'success.subscription_tiers_tracked'),
        data: tierDetails,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Track subscription tiers failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async getSubscriptionHistory(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role } = req;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'subscription', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const subscriptions = await subscriptionService.getSubscriptionHistory(userId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_HISTORY_VIEWED'),
        details: { userId },
        ipAddress: req.ip,
      });

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'subscription', languageCode, 'success.subscription_history_retrieved'),
        data: subscriptions,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Get subscription history failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },
};