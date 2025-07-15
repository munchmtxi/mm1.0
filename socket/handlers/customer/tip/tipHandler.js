'use strict';

/**
 * Socket handler for customer tip events
 */

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const tipEvents = require('@socket/events/customer/tip/tipEvents');
const localizationConstants = require('@constants/common/localizationConstants');
const socketConstants = require('@constants/common/socketConstants');
const logger = require('@utils/logger');

module.exports = (io, socket) => {
  /**
   * Handle TIP_RECEIVED event
   */
  socket.on(tipEvents.TIP_RECEIVED, async (data) => {
    const { userId, role, tipId, amount, currency, serviceType } = data;
    const languageCode = socket.handshake.query.languageCode || localizationConstants.DEFAULT_LANGUAGE;

    try {
      await socketService.emit(io, tipEvents.TIP_RECEIVED, {
        userId,
        role,
        tipId,
        amount,
        currency,
        serviceType,
        auditAction: 'TIP_RECEIVED',
      }, `${role}:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: 'tip_received',
        messageKey: 'tip.received',
        messageParams: { amount, currency, serviceType },
        role: 'notifications',
        module: 'tip',
        languageCode,
      });

      logger.info('Tip received event handled', { tipId, userId, role });
    } catch (error) {
      logger.error('Failed to handle TIP_RECEIVED event', { error: error.message, tipId, userId });
    }
  });

  /**
   * Handle TIP_UPDATED event
   */
  socket.on(tipEvents.TIP_UPDATED, async (data) => {
    const { userId, role, tipId, status } = data;
    const languageCode = socket.handshake.query.languageCode || localizationConstants.DEFAULT_LANGUAGE;

    try {
      await socketService.emit(io, tipEvents.TIP_UPDATED, {
        userId,
        role,
        tipId,
        status,
        auditAction: 'TIP_UPDATED',
      }, `${role}:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: 'tip_updated',
        messageKey: 'tip.updated',
        messageParams: { tipId, status },
        role: 'notifications',
        module: 'tip',
        languageCode,
      });

      logger.info('Tip updated event handled', { tipId, userId, role });
    } catch (error) {
      logger.error('Failed to handle TIP_UPDATED event', { error: error.message, tipId, userId });
    }
  });
};