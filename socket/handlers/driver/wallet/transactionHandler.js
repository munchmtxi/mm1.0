'use strict';

const transactionEvents = require('@socket/events/driver/wallet_transactionEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeTransactionHandlers(socket) {
  socket.on('transaction:recorded', (data) => {
    logger.info('Transaction recorded event received', { data });
    socketService.emitToUser(data.driverId, 'transaction:recorded', data);
  });

  socket.on('transaction:history_viewed', (data) => {
    logger.info('Transaction history viewed event received', { data });
    socketService.emitToUser(data.driverId, 'transaction:history_viewed', data);
  });

  socket.on('transaction:revrsed', (data) => {
    logger.info('Transaction reversed event received', { data });
    socketService.emitToUser(data.driverId, 'transaction:reversed', data);
  });

  socket.on('transaction:exported', (data) => {
    logger.info('Transaction exported event received', { data });
    socketService.emitToUser(data.driverId, 'transaction:exported', data);
  });
}

module.exports = {
  initializeTransactionHandlers,
};