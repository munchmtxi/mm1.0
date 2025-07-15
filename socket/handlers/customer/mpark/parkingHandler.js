'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

/**
 * Handle parking-related socket events.
 */
module.exports = (io, socket) => {
  socket.on('PARKING_BOOKING_CREATED', (data) => {
    logger.info('Parking reserved event received', { data });
    socketService.emit(io, 'PARKING_BOOKING_CREATED', data, `customer:${data.userId}`);
  });

  socket.on('PARKING_SUBSCRIPTION_MANAGED', (data) => {
    logger.info('Subscription managed event received', { data });
    socketService.emit(io, 'PARKING_SUBSCRIPTION_MANAGED', data, `customer:${data.userId}`);
  });
};