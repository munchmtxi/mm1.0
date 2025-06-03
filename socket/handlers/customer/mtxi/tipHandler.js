'use strict';

const tipEvents = require('@events/customer/mtxi/tipEvents');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const customerConstants = require('@constants/customer/customerConstants');
const tipConstants = require('@constants/customer/tipConstants');
const { formatMessage } = require('@utils/localization/localization');
const logger = require('@utils/logger');

async function initializeTipHandler() {
  try {
    socketService.on(tipEvents.TIP_SENT, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        message: formatMessage('tip_sent', { tipId: data.tipId }),
      });
    });

    socketService.on(tipEvents.TIP_CANCELLED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        message: formatMessage('tip_cancelled', { tipId: data.tipId }),
      });
    });

    socketService.on(tipEvents.TIP_UPDATED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.UPDATED,
        message: formatMessage('tip_status_updated', { tipId: data.tipId, status: data.newStatus }),
      });
    });

    logger.info('Tip event handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize tip handlers', { error: error.message });
    throw error;
  }
}

module.exports = { initializeTipHandler };