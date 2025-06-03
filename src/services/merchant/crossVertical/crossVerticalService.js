// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\crossVertical\crossVerticalService.js
'use strict';

const { sequelize, User, Merchant, MerchantBranch, Order, Booking, Customer, GamificationPoints } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const customerConstants = require('@constants/customerConstants');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class CrossVerticalService {
  static async unifyServices(merchantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      if (!branches.length) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.noBranches'), 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
      }

      const orders = await Order.count({ where: { merchant_id: merchantId, status: 'pending' }, transaction });
      const bookings = await Booking.count({ where: { merchant_id: merchantId, status: 'pending' }, transaction });

      for (const branch of branches) {
        await branch.update({
          payment_methods: { mtables: true, munch: true },
          preferred_language: merchant.preferred_language,
        }, { transaction });
      }

      const message = formatMessage(merchant.preferred_language, 'crossVertical.servicesUnified', { orders, bookings });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, orders, bookings },
        ipAddress,
      }, transaction);

      socketService.emit(`crossVertical:servicesUnified:${merchantId}`, { merchantId, orders, bookings });

      await transaction.commit();
      logger.info(`Unified mtables/munch for merchant ${merchantId}: ${orders} orders, ${bookings} bookings`);
      return { merchantId, orders, bookings };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('unifyServices', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async syncLoyaltyPoints(customerId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const munchPoints = await GamificationPoints.sum('points', {
        where: {
          user_id: customerId,
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.ORDER_COMPLETION.action,
        },
        transaction,
      }) || 0;

      const mtablesPoints = await GamificationPoints.sum('points', {
        where: {
          user_id: customerId,
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.BOOKING_COMPLETION.action,
        },
        transaction,
      }) || 0;

      const totalPoints = munchPoints + mtablesPoints;

      await gamificationService.awardPoints({
        userId: customerId,
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.LOYALTY_SYNC.action,
        points: totalPoints,
        metadata: { munchPoints, mtablesPoints },
      }, transaction);

      const message = formatMessage(customer.preferred_language, 'crossVertical.pointsSynced', { totalPoints });
      await notificationService.createNotification({
        userId: customerId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, totalPoints, munchPoints, mtablesPoints },
        ipAddress,
      }, transaction);

      socketService.emit(`crossVertical:pointsSynced:${customerId}`, { customerId, totalPoints });

      await transaction.commit();
      logger.info(`Synced ${totalPoints} loyalty points for customer ${customerId}`);
      return { customerId, totalPoints };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('syncLoyaltyPoints', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async ensureConsistentUI(merchantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id', 'preferred_language'] }],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      if (!branches.length) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.noBranches'), 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
      }

      const uiSettings = {
        theme: merchantConstants.UI_CONSTANTS.DEFAULT_THEME,
        language: merchant.preferred_language,
        font: customerConstants.ACCESSIBILITY_CONSTANTS.DEFAULT_FONT,
      };

      for (const branch of branches) {
        await branch.update({ preferred_language: uiSettings.language }, { transaction });
      }

      await merchant.update({ preferred_language: uiSettings.language }, { transaction });

      const message = formatMessage(merchant.preferred_language, 'crossVertical.uiEnsured', { theme: uiSettings.theme });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'LOW',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, uiSettings },
        ipAddress,
      }, transaction);

      socketService.emit(`crossVertical:uiEnsured:${merchantId}`, { merchantId, uiSettings });

      await transaction.commit();
      logger.info(`Ensured consistent UI for merchant ${merchantId}: ${JSON.stringify(uiSettings)}`);
      return { merchantId, uiSettings };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('ensureConsistentUI', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async trackCrossVerticalGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'crossVertical', 'en', 'crossVertical.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const munchOrders = await Order.count({
        where: { customer_id: customerId, status: 'completed' },
      });

      const mtablesBookings = await Booking.count({
        where: { customer_id: customerId, status: 'seated' },
      });

      const points =
        (munchOrders && mtablesBookings ? customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.CROSS_VERTICAL_USAGE.points : 0);

      if (points > 0) {
        await gamificationService.awardPoints({
          userId: customerId,
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.CROSS_VERTICAL_USAGE.action,
          points,
          metadata: { munchOrders, mtablesBookings },
        });

        const message = formatMessage(customer.preferred_language, 'crossVertical.pointsAwarded', { points });
        await notificationService.createNotification({
          userId: customerId,
          type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          message,
          priority: 'LOW',
          languageCode: customer.preferred_language,
        });

        socketService.emit(`crossVertical:gamification:${customerId}`, { customerId, points });
      }

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, pointsAwarded: points, munchOrders, mtablesBookings },
        ipAddress,
      });

      logger.info(`Cross-vertical gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackCrossVerticalGamification', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }
}

module.exports = CrossVerticalService;