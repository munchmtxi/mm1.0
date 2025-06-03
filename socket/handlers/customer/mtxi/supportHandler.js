'use strict';

const supportEvents = require('@events/customer/mtxi/supportEvents');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization/localization');
const logger = require('@utils/logger');

async function initializeSupportHandler() {
  try {
    socketService.on(supportEvents.TICKET_CREATED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
        message: formatMessage('support.ticket.created', { ticketId: data.ticketId }),
      });
    });

    socketService.on(supportEvents.TICKET_ESCALATED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
        message: formatMessage('support.ticket.escalated', { ticketId: data.ticketId }),
      });
    });

    socketService.on(supportEvents.TICKET_CLOSED, async (data) => {
      await notificationService.sendNotification({
        userId: data.userId,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
        message: formatMessage('support.ticket.closed', { ticketId: data.ticketId }),
      });
    });

    logger.info('Support event handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize support handlers', { error: error.message });
    throw error;
  }
}

module.exports = { initializeSupportHandler };