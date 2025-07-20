'use strict';

const { Op } = require('sequelize');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const config = require('@config/config');
const { formatMessage } = require('@utils/localizationService');
const { Notification, NotificationLog, User, Merchant, MerchantBranch, Staff, Driver, Customer } = require('@models');
const Redis = require('ioredis');
const { sendEmail } = require('@utils/zohoMailClient');
const { sendPushNotification } = require('@utils/zohoPushClient');
const { sendSMS, sendWhatsApp } = require('@utils/twilioClient');
const AppError = require('@utils/AppError');
const socketService = require('@services/socketService');
const roomUtils = require('@socket/rooms');
const TemplateService = require('@services/templateService');

// Redis client
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

// Local constants
const DELIVERY_METHODS = ['push', 'email', 'sms', 'whatsapp', 'in_app'];
const PRIORITY_LEVELS = ['low', 'medium', 'high'];
const NOTIFICATION_TYPES = ['announcement', 'order_update', 'booking_update', 'payment_confirmation', 'account_update'];
const NOTIFICATION_SETTINGS = {
  MAX_NOTIFICATIONS_PER_HOUR: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_INTERVAL_SECONDS: 60,
  DATA_RETENTION_DAYS: 30,
  SUPPORTED_LANGUAGES: localizationConstants.SUPPORTED_LANGUAGES,
};
const ERROR_CODES = {
  DELIVERY_FAILED: 'NOTIFICATION_DELIVERY_FAILED',
  INVALID_TYPE: 'INVALID_NOTIFICATION_TYPE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  MISSING_PROFILE: 'MISSING_PROFILE',
};
const SUCCESS_MESSAGES = ['Notification sent successfully'];
const ANALYTICS_METRICS = {
  DELIVERY_RATE: 'notification_delivery_rate',
};

class NotificationService {
  async sendNotification({
    userId,
    notificationType,
    messageKey,
    messageParams = {},
    data = {},
    deliveryMethod = DELIVERY_METHODS[0], // push
    priority = PRIORITY_LEVELS[1], // medium
    merchantId = null,
    orderId = null,
    bookingId = null,
    role = 'customer',
    module = 'notifications',
    branchId = null,
    templateName = null, // Optional template name for role-specific template
  }) {
    try {
      if (!userId) throw new AppError('User ID is required', 400, 'MISSING_USER_ID');
      if (!this.isValidNotificationType(notificationType)) {
        throw new AppError('Invalid notification type', 400, ERROR_CODES.INVALID_TYPE);
      }
      if (!this.isValidDeliveryMethod(deliveryMethod)) {
        throw new AppError('Invalid delivery method', 400, 'INVALID_DELIVERY_METHOD');
      }
      if (!this.isValidPriority(priority)) {
        throw new AppError('Invalid priority level', 400, 'INVALID_PRIORITY_LEVEL');
      }

      // Fetch user with associated profiles
      const user = await User.findByPk(userId, {
        attributes: ['preferred_language', 'notification_preferences', 'email', 'phone', 'country'],
        include: [
          { model: Customer, as: 'customer_profile', attributes: ['phone_number'] },
          { model: Merchant, as: 'merchant_profile', attributes: ['phone_number', 'preferred_language'] },
          { model: Driver, as: 'driver_profile', attributes: ['phone_number'] },
          { model: Staff, as: 'staff_profile', attributes: ['merchant_id', 'branch_id'] },
        ],
      });
      if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

      // Validate role-specific preferences
      const preferences = user.notification_preferences || {};
      if (!preferences[deliveryMethod]) {
        logger.logWarnEvent(`Notification skipped: ${deliveryMethod} disabled`, { userId, notificationType });
        return { success: false, message: 'Notification method disabled' };
      }

      // Validate merchant and branch if provided
      if (merchantId) {
        const merchant = await Merchant.findByPk(merchantId);
        if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }
      if (branchId) {
        const branch = await MerchantBranch.findByPk(branchId);
        if (!branch || (merchantId && branch.merchant_id !== merchantId)) {
          throw new AppError('Invalid or mismatched branch', 400, 'INVALID_BRANCH');
        }
      }

      // Rate limiting
      const rateLimitKey = `notification:${userId}:hourly`;
      const notificationCount = await redisClient.get(rateLimitKey);
      if (parseInt(notificationCount) >= NOTIFICATION_SETTINGS.MAX_NOTIFICATIONS_PER_HOUR) {
        throw new AppError('Rate limit exceeded', 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
      }

      // Determine language with fallback
      let language = user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
      if (user.merchant_profile && user.merchant_profile.preferred_language) {
        language = user.merchant_profile.preferred_language;
      }
      if (!localizationConstants.SUPPORTED_LANGUAGES.includes(language)) {
        language = localizationConstants.DEFAULT_LANGUAGE;
      }

      // Format message or load template
      const country = user.country || 'US';
      let message;
      if (templateName) {
        message = await TemplateService.renderTemplate(templateName, role, language, messageParams);
      } else {
        message = formatMessage(role, module, language, messageKey, {
          ...messageParams,
          country,
        });
      }

      // Create notification
      const notification = await Notification.create({
        user_id: userId,
        merchant_id: merchantId,
        order_id: orderId,
        booking_id: bookingId,
        type: notificationType,
        message,
        priority,
        language_code: language,
        status: 'not_sent',
        read_status: false,
        data,
      });

      // Determine recipient based on delivery method and role
      let recipient;
      if (deliveryMethod === 'email') {
        recipient = user.email;
      } else if (deliveryMethod === 'sms' || deliveryMethod === 'whatsapp') {
        if (user.customer_profile) {
          recipient = user.customer_profile.format_phone_for_whatsapp();
        } else if (user.merchant_profile) {
          recipient = user.merchant_profile.format_phone_for_whatsapp();
        } else if (user.driver_profile) {
          recipient = user.driver_profile.format_phone_for_whatsapp();
        } else {
          recipient = user.phone ? await this.formatPhoneNumber(user.phone, user.country) : null;
        }
      }
      if (!recipient && deliveryMethod !== 'in_app') {
        throw new AppError(`No ${deliveryMethod} contact found for user`, 400, ERROR_CODES.INVALID_RECIPIENT);
      }

      const result = await this.deliverNotification({
        notificationId: notification.id,
        userId,
        recipient,
        message,
        deliveryMethod,
        data,
        retryCount: 0,
        branchId,
      });

      await redisClient.incr(rateLimitKey);
      await redisClient.expire(rateLimitKey, 3600);

      logger.logApiEvent('Notification sent', { notificationId: notification.id, userId, type: notificationType });

      return {
        success: true,
        notificationId: notification.id,
        message: SUCCESS_MESSAGES[0],
      };
    } catch (error) {
      logger.logErrorEvent(`Failed to send notification: ${error.message}`, { userId, notificationType });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'NOTIFICATION_ERROR');
    }
  }

  async sendBulkNotification({
    userIds,
    notificationType,
    messageKey,
    messageParams = {},
    data = {},
    deliveryMethod = DELIVERY_METHODS[0], // push
    priority = PRIORITY_LEVELS[1], // medium
    merchantId = null,
    orderId = null,
    bookingId = null,
    role = 'customer',
    module = 'notifications',
    branchId = null,
    templateName = null, // Optional template name
  }) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs array is required', 400, 'MISSING_USER_IDS');
      }

      const results = [];
      const errors = [];

      // Process notifications in batches to avoid overwhelming the system
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromises = batch.map(userId =>
          this.sendNotification({
            userId,
            notificationType,
            messageKey,
            messageParams,
            data,
            deliveryMethod,
            priority,
            merchantId,
            orderId,
            bookingId,
            role,
            module,
            branchId,
            templateName,
          }).catch(error => ({
            userId,
            success: false,
            error: error.message,
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r.success));
        errors.push(...batchResults.filter(r => !r.success));
      }

      logger.logApiEvent('Bulk notification processed', {
        total: userIds.length,
        successful: results.length,
        failed: errors.length,
      });

      return {
        success: true,
        results,
        errors,
        message: `Processed ${userIds.length} notifications: ${results.length} succeeded, ${errors.length} failed`,
      };
    } catch (error) {
      logger.logErrorEvent(`Failed to process bulk notification: ${error.message}`, { notificationType });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'BULK_NOTIFICATION_ERROR');
    }
  }

  async setNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findByPk(userId, { attributes: ['notification_preferences'] });
      if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

      const allowed = DELIVERY_METHODS;
      if (Object.keys(preferences).some(key => !allowed.includes(key))) {
        throw new AppError('Invalid notification preference', 400, 'INVALID_PREFERENCE');
      }

      await user.update({ notification_preferences: preferences });
      logger.logApiEvent('Notification preferences updated', { userId, preferences });

      return { success: true, message: 'Preferences updated' };
    } catch (error) {
      logger.logErrorEvent(`Failed to update preferences: ${error.message}`, { userId });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'PREFERENCE_UPDATE_ERROR');
    }
  }

  async trackNotificationDelivery(userId) {
    try {
      const notifications = await Notification.findAll({
        where: { user_id: userId },
        attributes: ['id', 'status', 'created_at', 'type', 'priority'],
        include: [
          { model: NotificationLog, as: 'logs', attributes: ['status', 'retry_count', 'error', 'delivery_provider'] },
          { model: Merchant, as: 'merchant', attributes: ['business_name'] },
        ],
      });

      const summary = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'not_sent').length,
      };

      logger.logApiEvent('Notification delivery tracked', { userId, summary });
      return { success: true, summary, notifications };
    } catch (error) {
      logger.logErrorEvent(`Failed to track delivery: ${error.message}`, { userId });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'TRACK_DELIVERY_ERROR');
    }
  }

  async getNotificationHistory(userId) {
    try {
      const notifications = await Notification.findAll({
        where: { user_id: userId },
        attributes: ['id', 'type', 'message', 'priority', 'status', 'read_status', 'created_at'],
        order: [['created_at', 'DESC']],
        include: [
          { model: NotificationLog, as: 'logs', attributes: ['type', 'status', 'message_id', 'error', 'created_at'] },
          { model: Merchant, as: 'merchant', attributes: ['business_name'] },
        ],
      });

      logger.logApiEvent('Notification history retrieved', { userId, count: notifications.length });
      return { success: true, notifications };
    } catch (error) {
      logger.logErrorEvent(`Failed to retrieve history: ${error.message}`, { userId });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'HISTORY_RETRIEVAL_ERROR');
    }
  }

  isValidNotificationType(type) {
    return NOTIFICATION_TYPES.includes(type);
  }

  isValidDeliveryMethod(method) {
    return DELIVERY_METHODS.includes(method);
  }

  isValidPriority(priority) {
    return PRIORITY_LEVELS.includes(priority);
  }

  async formatPhoneNumber(phone, country) {
    const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
    try {
      const number = phoneUtil.parse(phone, country);
      if (!phoneUtil.isValidNumber(number)) {
        throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE_NUMBER');
      }
      return `+${number.getCountryCode()}${number.getNationalNumber()}`;
    } catch (error) {
      throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE_NUMBER');
    }
  }

  async deliverNotification(payload) {
    const { notificationId, userId, recipient, message, deliveryMethod, data, retryCount, branchId } = payload;

    try {
      let result;
      let deliveryProvider;
      let messageId;

      switch (deliveryMethod) {
        case 'push':
          deliveryProvider = 'zoho';
          result = await sendPushNotification(userId, message, data);
          messageId = result.messageId;
          break;
        case 'email':
          deliveryProvider = 'zoho';
          result = await sendEmail(recipient, message, data);
          messageId = result.messageId;
          break;
        case 'sms':
          deliveryProvider = 'twilio';
          result = await sendSMS(recipient, message, data);
          messageId = result.sid;
          break;
        case 'whatsapp':
          deliveryProvider = 'twilio';
          result = await sendWhatsApp(recipient, message, data);
          messageId = result.sid;
          break;
        case 'in_app':
          deliveryProvider = 'socket';
          result = await this.storeInAppNotification(userId, message, data);
          messageId = null;
          break;
        default:
          throw new AppError('Unsupported delivery method', 400, 'UNSUPPORTED_DELIVERY_METHOD');
      }

      await Notification.update({ status: 'sent' }, { where: { id: notificationId } });

      await NotificationLog.create({
        notification_id: notificationId,
        type: deliveryMethod.toUpperCase(),
        recipient,
        content: message,
        status: 'SENT',
        message_id: messageId,
        delivery_provider: deliveryProvider,
        delivery_metadata: result.metadata || {},
        retry_count: retryCount,
      });

      await this.updateAnalytics(notificationId, 'delivered');

      return result;
    } catch (error) {
      logger.logErrorEvent(`Notification delivery failed: ${error.message}`, {
        notificationId,
        deliveryMethod,
        retryCount,
      });

      await NotificationLog.create({
        notification_id: notificationId,
        type: deliveryMethod.toUpperCase(),
        recipient,
        content: message,
        status: retryCount < NOTIFICATION_SETTINGS.RETRY_ATTEMPTS ? 'FAILED' : 'PERMANENTLY_FAILED',
        error: error.message,
        retry_count: retryCount,
        delivery_provider: deliveryProvider || 'unknown',
      });

      if (retryCount < NOTIFICATION_SETTINGS.RETRY_ATTEMPTS) {
        await this.scheduleRetry({ ...payload, retryCount: retryCount + 1 });
      } else {
        await Notification.update({ status: 'failed' }, { where: { id: notificationId } });
        throw new AppError('Notification delivery failed after retries', 500, ERROR_CODES.DELIVERY_FAILED);
      }
    }
  }

  async storeInAppNotification(userId, message, data) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type: NOTIFICATION_TYPES[0], // announcement
        message,
        priority: PRIORITY_LEVELS[0], // low
        language_code: localizationConstants.DEFAULT_LANGUAGE,
        status: 'sent',
        read_status: false,
        data,
      });

      // Emit socket event for real-time in-app notification
      const room = roomUtils.getUserRoom(userId, 'customer', data.service || 'munch');
      await socketService.emit(
        global.io,
        'NOTIFICATION',
        {
          userId,
          role: 'customer',
          service: data.service || 'munch',
          notificationId: notification.id,
          message,
          data,
        },
        room,
        localizationConstants.DEFAULT_LANGUAGE
      );

      return { success: true };
    } catch (error) {
      throw new AppError('Failed to store or emit in-app notification', 500, 'IN_APP_NOTIFICATION_ERROR');
    }
  }

  async scheduleRetry(payload) {
    const { notificationId, retryCount } = payload;

    try {
      const nextRetryAt = new Date();
      nextRetryAt.setSeconds(nextRetryAt.getSeconds() + NOTIFICATION_SETTINGS.RETRY_INTERVAL_SECONDS);

      await NotificationLog.update(
        { next_retry_at: nextRetryAt },
        { where: { notification_id: notificationId, retry_count: retryCount } }
      );

      setTimeout(async () => {
        try {
          await this.deliverNotification(payload);
        } catch (error) {
          logger.logErrorEvent(`Retry failed: ${error.message}`, { notificationId, retryCount });
        }
      }, NOTIFICATION_SETTINGS.RETRY_INTERVAL_SECONDS * 1000);
    } catch (error) {
      throw new AppError('Failed to schedule retry', 500, 'RETRY_SCHEDULE_ERROR');
    }
  }

  async updateAnalytics(notificationId, action) {
    try {
      await sequelize.query(
        'INSERT INTO notification_analytics (notification_id, action, created_at) VALUES (:notification_id, :action, :created_at)',
        {
          replacements: {
            notification_id: notificationId,
            action,
            created_at: new Date(),
          },
        }
      );

      if (action === 'delivered') {
        await sequelize.query(
          `INSERT INTO analytics_metrics (metric, count) 
           VALUES (:metric, 1) 
           ON CONFLICT (metric) DO UPDATE SET count = analytics_metrics.count + 1`,
          { replacements: { metric: ANALYTICS_METRICS.DELIVERY_RATE } }
        );
      }
    } catch (error) {
      throw new AppError('Failed to update analytics', 500, 'ANALYTICS_UPDATE_ERROR');
    }
  }

  async cleanupOldNotifications() {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - NOTIFICATION_SETTINGS.DATA_RETENTION_DAYS);

      await Notification.destroy({
        where: { created_at: { [Op.lt]: retentionDate } },
      });
      await NotificationLog.destroy({
        where: { created_at: { [Op.lt]: retentionDate } },
      });

      logger.logInfoEvent('Old notification logs cleaned up', { retentionDate });
    } catch (error) {
      throw new AppError('Failed to clean up old notifications', 500, 'CLEANUP_ERROR');
    }
  }
}

module.exports = new NotificationService();