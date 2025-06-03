// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\offline\offlineService.js
'use strict';

const { sequelize, User, Merchant, MerchantBranch, Order, Booking, OfflineCache, Customer } = require('@models');
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

class OfflineService {
  static async cacheOrders(restaurantId, orders, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(restaurantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      if (!branch) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidBranch'), 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
      }

      for (const order of orders) {
        if (!order.items || !order.total_amount || !order.customer_id) {
          throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidOrderData'), 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
        }
        await OfflineCache.create({
          merchant_id: restaurantId,
          branch_id: branch.id,
          data_type: 'order',
          data: order,
          status: 'pending',
        }, { transaction });
      }

      const message = formatMessage(merchant.preferred_language, 'offline.ordersCached', { count: orders.length });
      await notificationService.createNotification({
        userId: restaurantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId: restaurantId, orderCount: orders.length },
        ipAddress,
      }, transaction);

      socketService.emit(`offline:ordersCached:${restaurantId}`, { merchantId: restaurantId, orderCount: orders.length });

      await transaction.commit();
      logger.info(`Cached ${orders.length} orders for merchant ${restaurantId}`);
      return { merchantId: restaurantId, orderCount: orders.length };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('cacheOrders', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async cacheBookings(restaurantId, bookings, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(restaurantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      if (!branch) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidBranch'), 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
      }

      for (const booking of bookings) {
        if (!booking.booking_date || !booking.booking_time || !booking.customer_id) {
          throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidBookingData'), 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
        }
        await OfflineCache.create({
          merchant_id: restaurantId,
          branch_id: branch.id,
          data_type: 'booking',
          data: booking,
          status: 'pending',
        }, { transaction });
      }

      const message = formatMessage(merchant.preferred_language, 'offline.bookingsCached', { count: bookings.length });
      await notificationService.createNotification({
        userId: restaurantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId: restaurantId, bookingCount: bookings.length },
        ipAddress,
      }, transaction);

      socketService.emit(`offline:bookingsCached:${restaurantId}`, { merchantId: restaurantId, bookingCount: bookings.length });

      await transaction.commit();
      logger.info(`Cached ${bookings.length} bookings for merchant ${restaurantId}`);
      return { merchantId: restaurantId, bookingCount: bookings.length };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('cacheBookings', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async syncOfflineData(restaurantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(restaurantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const cachedItems = await OfflineCache.findAll({
        where: { merchant_id: restaurantId, status: 'pending' },
        transaction,
      });

      let orderCount = 0;
      let bookingCount = 0;

      for (const item of cachedItems) {
        try {
          if (item.data_type === 'order') {
            const orderData = item.data;
            const customer = await Customer.findByPk(orderData.customer_id, { transaction });
            if (!customer) {
              throw new AppError('Invalid customer', 404);
            }
            const order = await Order.create({
              ...orderData,
              merchant_id: restaurantId,
              branch_id: item.branch_id,
              order_number: `OFFLINE-${Date.now()}-${orderCount}`,
              status: 'pending',
              payment_status: 'unpaid',
              currency: orderData.currency || 'MWK',
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction });
            item.status = 'synced';
            orderCount++;
          } else if (item.data_type === 'booking') {
            const bookingData = item.data;
            const customer = await Customer.findByPk(bookingData.customer_id, { transaction });
            if (!customer) {
              throw new AppError('Invalid customer', 404);
            }
            const booking = await Booking.create({
              ...bookingData,
              merchant_id: restaurantId,
              branch_id: item.branch_id,
              reference: `OFFLINE-BK-${Date.now()}-${bookingCount}`,
              status: 'pending',
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction });
            item.status = 'synced';
            bookingCount++;
          }
          await item.save({ transaction });
        } catch (error) {
          item.status = 'failed';
          await item.save({ transaction });
          logger.error(`Failed to sync ${item.data_type} for merchant ${restaurantId}: ${error.message}`);
        }
      }

      const message = formatMessage(merchant.preferred_language, 'offline.dataSynced', { orderCount, bookingCount });
      await notificationService.createNotification({
        userId: restaurantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId: restaurantId, orderCount, bookingCount },
        ipAddress,
      }, transaction);

      socketService.emit(`offline:dataSynced:${restaurantId}`, { merchantId: restaurantId, orderCount, bookingCount });

      await transaction.commit();
      logger.info(`Synced ${orderCount} orders and ${bookingCount} bookings for merchant ${restaurantId}`);
      return { merchantId: restaurantId, orderCount, bookingCount };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('syncOfflineData', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async trackOfflineGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'offline', 'en', 'offline.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const offlineOrders = await OfflineCache.count({
        where: {
          data_type: 'order',
          data: { customer_id: customerId },
          status: 'synced',
        },
      });

      const offlineBookings = await OfflineCache.count({
        where: {
          data_type: 'booking',
          data: { customer_id: customerId },
          status: 'synced',
        },
      });

      const points =
        (offlineOrders * customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.OFFLINE_ORDER.points) +
        (offlineBookings * customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.OFFLINE_BOOKING.points);

      if (points > 0) {
        await gamificationService.awardPoints({
          userId: customerId,
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.OFFLINE_USAGE.action,
          points,
          metadata: { offlineOrders, offlineBookings },
        });

        const message = formatMessage(customer.preferred_language, 'offline.pointsAwarded', { points });
        await notificationService.createNotification({
          userId: customerId,
          type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          message,
          priority: 'LOW',
          languageCode: customer.preferred_language,
        });

        socketService.emit(`offline:gamification:${customerId}`, { customerId, points });
      }

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, pointsAwarded: points, offlineOrders, offlineBookings },
        ipAddress,
      });

      logger.info(`Offline gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackOfflineGamification', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }
}

module.exports = OfflineService;