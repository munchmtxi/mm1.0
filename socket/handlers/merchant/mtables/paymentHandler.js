'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupPaymentHandlers(io, socket) {
  socket.on('payment:completed', (data) => {
    logger.info('Payment completed event received', { data });
    socketService.emit(io, 'payment:completed', data);
  });

  socket.on('payment:refunded', (data) => {
    logger.info('Refund issued event received', { data });
    socketService.emit(io, 'payment:refunded', data);
  });
}

module.exports = { setupPaymentHandlers };