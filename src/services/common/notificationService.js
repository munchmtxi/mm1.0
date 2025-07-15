'use strict';

/**
 * Notification Service
 * Centralized service for managing notifications across all roles and services.
 * Handles notification creation, validation, delivery, localization, rate limiting,
 * retries, and analytics. Integrates with Zoho for email and push notifications.
 *
 * Dependencies:
 * - notificationConstants.js (types, delivery methods, settings)
 * - localizationConstants.js (language settings)
 * - logger.js (custom logging)
 * - config.js (environment settings)
 * - localizationService.js (message formatting)
 * - Sequelize models: Notification, NotificationLog, User
 * - External APIs: twilio (SMS/WhatsApp), Zoho (email, push)
 * - Redis for rate limiting
 *
 * Last Updated: June 25, 2025
 */

const { Op } = require('sequelize');
const notificationConstants = require('@constants/common/notificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const config = require('@config/config');
const { formatMessage } = require('@utils/localizationService');
const { Notification, NotificationLog, User } = require('@models');
const Redis = require('ioredis');
const { sendEmail } = require('@utils/zohoMailClient');
const { sendPushNotification } = require('@utils/zohoPushClient');
const { sendSMS, sendWhatsApp } = require('@utils/twilioClient');

// Redis client
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

class NotificationService {
  /**
   * Sends a notification to a user
   * @param {Object} params - Notification parameters
   * @param {number} params.userId - User ID
   * @param {string} params.notificationType - Notification type
   * @param {string} params.messageKey - Message key for localization
   * @param {Object} [params.messageParams] - Parameters for message formatting
   * @param {Object} [params.data] - Additional data
   * @param {string} [params.deliveryMethod] - Delivery method (default: push)
   * @param {string} [params.priority] - Priority level (default: medium)
   * @param {number} [params.merchantId] - Merchant ID (optional)
   * @param {number} [params.orderId] - Order ID (optional)
   * @param {number} [params.bookingId] - Booking ID (optional)
   * @param {string} [params.role] - Role for localization (default: customer)
   * @param {string} [params.module] - Module for localization (default: notifications)
   * @returns {Promise<Object>} - Result of notification delivery
   */
  async sendNotification({
    userId,
    notificationType,
    messageKey,
    messageParams = {},
    data = {},
    deliveryMethod = notificationConstants.DELIVERY_METHODS[0], // push
    priority = notificationConstants.PRIORITY_LEVELS[1], // medium
    merchantId = null,
    orderId = null,
    bookingId = null,
    role = 'customer',
    module = 'notifications',
  }) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!this.isValidNotificationType(notificationType)) throw new Error(notificationConstants.ERROR_CODES[1]);
      if (!this.isValidDeliveryMethod(deliveryMethod)) throw new Error('Invalid delivery method');
      if (!this.isValidPriority(priority)) throw new Error('Invalid priority level');

      const user = await User.findByPk(userId, {
        attributes: ['preferred_language', 'notification_preferences', 'email', 'phone'],
      });
      if (!user) throw new Error('User not found');

      if (!user.notification_preferences[deliveryMethod]) {
        logger.logWarnEvent(`Notification skipped: ${deliveryMethod} disabled`, { userId, notificationType });
        return { success: false, message: 'Notification method disabled' };
      }

      const rateLimitKey = `notification:${userId}:hourly`;
      const notificationCount = await redisClient.get(rateLimitKey);
      if (parseInt(notificationCount) >= notificationConstants.NOTIFICATION_SETTINGS.MAX_NOTIFICATIONS_PER_HOUR) {
        throw new Error(notificationConstants.ERROR_CODES[2]);
      }

      const language = user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;
      if (!localizationConstants.SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error('Unsupported language');
      }
      const message = formatMessage(role, module, language, messageKey, messageParams);

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
      });

      const recipient = deliveryMethod === notificationConstants.DELIVERY_METHODS[2] ? user.email : user.phone;
      if (!recipient && deliveryMethod !== 'in_app') {
        throw new Error(`No ${deliveryMethod} contact found for user`);
      }

      const result = await this.deliverNotification({
        notificationId: notification.id,
        userId,
        recipient,
        message,
        deliveryMethod,
        data,
        retryCount: 0,
      });

      await redisClient.incr(rateLimitKey);
      await redisClient.expire(rateLimitKey, 3600);

      logger.logApiEvent('Notification sent', { notificationId: notification.id, userId, type: notificationType });

      return {
        success: true,
        notificationId: notification.id,
        message: notificationConstants.SUCCESS_MESSAGES[0],
      };
    } catch (error) {
      logger.logErrorEvent(`Failed to send notification: ${error.message}`, { userId, notificationType });
      throw error;
    }
  }

  /**
   * Sets user notification preferences
   * @param {number} userId - User ID
   * @param {Object} preferences - Notification preferences (e.g., { email: true, sms: false })
   * @returns {Promise<Object>} - Update result
   */
  async setNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findByPk(userId, { attributes: ['notification_preferences'] });
      if (!user) throw new Error('User not found');

      const allowed = ['email', 'sms', 'push', 'whatsapp'];
      if (Object.keys(preferences).some(key => !allowed.includes(key))) {
        throw new Error('Invalid notification preference');
      }

      await user.update({ notification_preferences: preferences });
      logger.logApiEvent('Notification preferences updated', { userId, preferences });

      return { success: true, message: 'Preferences updated' };
    } catch (error) {
      logger.logErrorEvent(`Failed to update preferences: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Tracks notification delivery status
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Delivery status summary
   */
  async trackNotificationDelivery(userId) {
    try {
      const notifications = await Notification.findAll({
        where: { user_id: userId },
        attributes: ['id', 'status', 'created_at'],
        include: [{ model: NotificationLog, as: 'logs', attributes: ['status', 'retry_count', 'error'] }],
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
      throw error;
    }
  }

  /**
   * Retrieves notification history for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Notification history
   */
  async getNotificationHistory(userId) {
    try {
      const notifications = await Notification.findAll({
        where: { user_id: userId },
        attributes: ['id', 'type', 'message', 'priority', 'status', 'read_status', 'created_at'],
        order: [['created_at', 'DESC']],
        include: [
          { model: NotificationLog, as: 'logs', attributes: ['type', 'status', 'message_id', 'error', 'created_at'] },
        ],
      });

      logger.logApiEvent('Notification history retrieved', { userId, count: notifications.length });
      return { success: true, notifications };
    } catch (error) {
      logger.logErrorEvent(`Failed to retrieve history: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * Validates notification type
   * @param {string} type - Notification type
   * @returns {boolean} - Validity
   */
  isValidNotificationType(type) {
    return notificationConstants.NOTIFICATION_TYPES.includes(type);
  }

  /**
   * Validates delivery method
   * @param {string} method - Delivery method
   * @returns {boolean} - Validity
   */
  isValidDeliveryMethod(method) {
    return notificationConstants.DELIVERY_METHODS.includes(method);
  }

  /**
   * Validates priority level
   * @param {string} priority - Priority level
   * @returns {boolean} - Validity
   */
  isValidPriority(priority) {
    return notificationConstants.PRIORITY_LEVELS.includes(priority);
  }

  /**
   * Delivers notification based on method
   * @param {Object} payload - Notification payload
   * @returns {Promise<Object>} - Delivery result
   */
  async deliverNotification(payload) {
    const { notificationId, userId, recipient, message, deliveryMethod, data, retryCount } = payload;

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
          deliveryProvider = 'internal';
          result = await this.storeInAppNotification(userId, message, data);
          messageId = null;
          break;
        default:
          throw new Error('Unsupported delivery method');
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
        status: retryCount < notificationConstants.NOTIFICATION_SETTINGS.RETRY_ATTEMPTS ? 'FAILED' : 'PERMANENTLY_FAILED',
        error: error.message,
        retry_count: retryCount,
        delivery_provider: deliveryProvider || 'unknown',
      });

      if (retryCount < notificationConstants.NOTIFICATION_SETTINGS.RETRY_ATTEMPTS) {
        await this.scheduleRetry({ ...payload, retryCount: retryCount + 1 });
      } else {
        await Notification.update({ status: 'failed' }, { where: { id: notificationId } });
        throw new Error(notificationConstants.ERROR_CODES[0]);
      }
    }
  }

  /**
   * Stores in-app notification
   * @param {number} userId - User ID
   * @param {string} message - Message
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Storage result
   */
  async storeInAppNotification(userId, message, data) {
    await Notification.create({
      user_id: userId,
      type: notificationConstants.NOTIFICATION_TYPES[0], // announcement
      message,
      priority: notificationConstants.PRIORITY_LEVELS[0], // low
      language_code: localizationConstants.DEFAULT_LANGUAGE,
      status: 'sent',
      read_status: false,
      data,
    });
    return { success: true };
  }

  /**
   * Schedules retry for failed notification
   * @param {Object} payload - Notification payload
   */
  async scheduleRetry(payload) {
    const { notificationId, retryCount } = payload;

    const nextRetryAt = new Date();
    nextRetryAt.setSeconds(nextRetryAt.getSeconds() + notificationConstants.NOTIFICATION_SETTINGS.RETRY_INTERVAL_SECONDS);

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
    }, notificationConstants.NOTIFICATION_SETTINGS.RETRY_INTERVAL_SECONDS * 1000);
  }

  /**
   * Updates analytics metrics
   * @param {number} notificationId - Notification ID
   * @param {string} action - Action (sent, delivered, opened, engaged)
   */
  async updateAnalytics(notificationId, action) {
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
        { replacements: { metric: notificationConstants.ANALYTICS_METRICS.DELIVERY_RATE } }
      );
    }
  }

  /**
   * Cleans up old notification logs
   */
  async cleanupOldNotifications() {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - notificationConstants.NOTIFICATION_SETTINGS.DATA_RETENTION_DAYS);

    await Notification.destroy({
      where: { created_at: { [Op.lt]: retentionDate } },
    });
    await NotificationLog.destroy({
      where: { created_at: { [Op.lt]: retentionDate } },
    });

    logger.logInfoEvent('Old notification logs cleaned up', { retentionDate });
  }
}

module.exports = new NotificationService();