'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const emitTipSubmitted = (paymentId, rideId, customerId, driverId) => {
  try {
    socketService.emitToRoom(`customer:${customerId}`, 'tip:submitted', { paymentId, rideId });
    socketService.emitToRoom(`driver:${driverId}`, 'tip:submitted', { paymentId, rideId });
    socketService.emitToRoom(`ride:${rideId}`, 'tip:submitted', { paymentId });
    logger.info('Tip submitted event emitted', { paymentId, rideId, customerId, driverId });
  } catch (error) {
    logger.error('Failed to emit tip submitted event', { error: error.message, paymentId });
  }
};

module.exports = { emitTipSubmitted };