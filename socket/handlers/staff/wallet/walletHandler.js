'use strict';

const socketService = require('@services/common/socketService');
const walletEvents = require('@socket/events/staff/wallet/wallet.events');
const logger = require('@utils/logger');

function setupWalletHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(walletEvents.BALANCE_RETRIEVED, (data) => {
      logger.info('Balance retrieved event received', { data });
      socketService.emit(`munch:wallet:${data.staffId}`, walletEvents.BALANCE_RETRIEVED, data);
    });

    socket.on(walletEvents.HISTORY_RETRIEVED, (data) => {
      logger.info('History retrieved event received', { data });
      socketService.emit(`munch:wallet:${data.staffId}`, walletEvents.HISTORY_RETRIEVED, data);
    });

    socket.on(walletEvents.WITHDRAWAL_REQUESTED, (data) => {
      logger.info('Withdrawal requested event received', { data });
      socketService.emit(`munch:wallet:${data.staffId}`, walletEvents.WITHDRAWAL_REQUESTED, data);
    });

    socket.on(walletEvents.MERCHANT_SYNCED, (data) => {
      logger.info('Merchant synced event received', { data });
      socketService.emit(`munch:wallet:${data.staffId}`, walletEvents.MERCHANT_SYNCED, data);
    });

    socket.on(walletEvents.PREFERENCES_UPDATED, (data) => {
      logger.info('Preferences updated event received', { data });
      socketService.emit(`munch:wallet:${data.staffId}`, walletEvents.PREFERENCES_UPDATED, data);
    });
  });
}

module.exports = { setupWalletHandlers };