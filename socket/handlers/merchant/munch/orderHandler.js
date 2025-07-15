'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupOrderEvents = (io, socket) => {
  socket.on('merchant:munch:orderProcessed', (data) => {
    logger.info('Order processed event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.ORDER_CONFIRMATION, data);
  });

  socket.on('merchant:munch:orderStatusUpdated', (data) => {
    logger.info('Order status updated event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.ORDER_STATUS_UPDATE, data);
  });

  socket.on('merchant:munch:paymentProcessed', (data) => {
    logger.info('Payment processed event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION, data);
  });
};

module.exports = { setupOrderEvents };