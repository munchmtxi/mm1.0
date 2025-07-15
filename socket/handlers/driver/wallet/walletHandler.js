'use strict';

const walletEvents = require('@socket/events/driver/wallet/walletEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeWalletHandlers(socket) {
  socket.on(walletEvents.BALANCE_UPDATED, (data) => {
    logger.info('Balance updated event received', { data });
    socketService.emitToUser(data.driverId, walletEvents.BALANCE_UPDATED, data);
  });

  socket.on(walletEvents.BALANCE_LOCKED, (data) => {
    logger.info('Balance locked event received', { data });
    socketService.emitToUser(data.driverId, walletEvents.BALANCE_LOCKED, data);
  });

  socket.on(walletEvents.BALANCE_UNLOCKED, (data) => {
    logger.info('Balance unlocked event received', { data });
    socketService.emitToUser(data.driverId, walletEvents.BALANCE_UNLOCKED, data);
  });
}

module.exports = {
  initializeWalletHandlers,
};