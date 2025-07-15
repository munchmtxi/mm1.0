'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');
const cvoEvents = require('@socket/events/customer/crossVerticalOutlook/cvoEvents');

/**
 * Handle service cancellation event
 */
function handleServiceCancelled(io, socket, data) {
  const { userId, role, details, languageCode = 'en' } = data;

  try {
    if (role !== 'customer') {
      throw new Error('Invalid role for service cancellation');
    }

    socketService.emit(io, cvoEvents.SERVICE_CANCELLED, data, `customer:${userId}`, languageCode);

    notificationService.sendNotification({
      userId,
      notificationType: 'service_cancelled',
      messageKey: 'crossVerticalOutlook.service_cancelled',
      messageParams: { serviceType: details.serviceType },
      role,
      module: 'crossVerticalOutlook',
      languageCode,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle service cancelled event', { userId, error: error.message });
    socket.emit(cvoEvents.ERROR, {
      message: formatMessage('customer', 'crossVerticalOutlook', languageCode, 'errors.socket_event_failed'),
      errorCode: 'SOCKET_EVENT_FAILED',
    });
  }
}

module.exports = {
  handleServiceCancelled,
};