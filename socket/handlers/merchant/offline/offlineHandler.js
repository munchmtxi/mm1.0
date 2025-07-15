'use strict';

const socketService = require('@services/common/socketService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

const setupOfflineEvents = (io, socket) => {
  socket.on('merchant:offline:ordersCached', (data) => {
    logger.info('Orders cached event received', { data });
    socketService.emit(socket.id, merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDERS_CACHED, data);
  });

  socket.on('merchant:offline:bookingsCached', (data) => {
    logger.info('Bookings cached event received', { data });
    socketService.emit(socket.id, merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BOOKINGS_CACHED, data);
  });

  socket.on('merchant:offline:dataSynced', (data) => {
    logger.info('Data synced event received', { data });
    socketService.emit(socket.id, merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DATA_SYNCED, data);
  });
};

module.exports = { setupOfflineEvents };