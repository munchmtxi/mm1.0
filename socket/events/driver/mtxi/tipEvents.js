'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const emitTipConfirmed = (paymentId, driverId) => {
  try {
    socketService.emitToRoom(`driver:${driverId}`, 'tip:confirmed', { paymentId });
    logger.info('Tip confirmed event emitted', { paymentId, driverId });
  } catch (error) {
    logger.error('Failed to emit tip confirmed event', { error: error.message, paymentId });
  }
};

module.exports = { emitTipConfirmed };