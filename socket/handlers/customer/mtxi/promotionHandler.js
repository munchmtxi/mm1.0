'use strict';

const promotionEvents = require('@events/customer/mtxi/promotionEvents');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization/localization');
const logger = require('@utils/logger');

async function initializePromotionHandler() {
  try {
    socketService.on(promotionEvents.PROMOTION_REDEEMED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message: formatMessage('promotion.redeemed', { promotionId: data.promotionId }),
      });
    });

    socketService.on(promotionEvents.PROMOTION_CANCELLED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message: formatMessage('promotion.cancelled', { promotionId: data.promotionId }),
      });
    });

    logger.info('Promotion event handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize promotion handlers', { error: error.message });
    throw error;
  }
}

module.exports = { initializePromotionHandler };