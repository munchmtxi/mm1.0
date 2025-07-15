'use strict';

/**
 * Socket handler for split payment events.
 */

const socketService = require('@services/common/socketService');
const socketConstants = require('@constants/common/socketConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

/**
 * Handles customer payment confirmed event.
 */
exports.handlePaymentConfirmed = (socket, io) => (data) => {
  const { userId, serviceId, serviceType, billSplitType, splitPayments } = data;
  const languageCode = socket.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    socketService.emit(
      io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_PAYMENT_CONFIRMED,
      {
        userId,
        role: 'customer',
        serviceId,
        serviceType,
        billSplitType,
        splitPayments,
        message: formatMessage('customer', 'payments', languageCode, 'success.payment_initiated', { serviceId, serviceType }),
      },
      `customer:${userId}`,
      languageCode
    );
    logger.info('Payment confirmed event handled', { userId, serviceId, serviceType });
  } catch (error) {
    logger.error('Failed to handle payment confirmed event', { userId, serviceId, error: error.message });
  }
};

/**
 * Handles customer payment refunded event.
 */
exports.handlePaymentRefunded = (socket, io) => (data) => {
  const { userId, serviceId, serviceType, refunds } = data;
  const languageCode = socket.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    socketService.emit(
      io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_PAYMENT_REFUNDED,
      {
        userId,
        role: 'customer',
        serviceId,
        serviceType,
        refunds,
        message: formatMessage('customer', 'payments', languageCode, 'success.refunded', { serviceId, serviceType }),
      },
      `customer:${userId}`,
      languageCode
    );
    logger.info('Payment refunded event handled', { userId, serviceId, serviceType });
  } catch (error) {
    logger.error('Failed to handle payment refunded event', { userId, serviceId, error: error.message });
  }
};