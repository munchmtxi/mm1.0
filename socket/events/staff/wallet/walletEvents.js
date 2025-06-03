'use strict';

/**
 * walletEvents.js
 * Socket events for munch wallet operations (staff role).
 * Events: wallet:balance_retrieved, wallet:history_retrieved, wallet:withdrawal_requested,
 * wallet:merchant_synced, wallet:preferences_updated.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupWalletEvents(io, socket) {
  socket.on('munch:wallet:balance_retrieved', (data) => {
    try {
      socketService.emit(io, 'wallet:balance_retrieved', {
        staffId: data.staffId,
        balance: data.balance,
        currency: data.currency,
      }, `munch:wallet:${data.staffId}`);
      logger.info('Balance retrieved event emitted', data);
    } catch (error) {
      logger.error('Balance retrieved event failed', { error: error.message, data });
    }
  });

  socket.on('munch:wallet:history_retrieved', (data) => {
    try {
      socketService.emit(io, 'wallet:history_retrieved', {
        staffId: data.staffId,
        transactions: data.transactions,
      }, `munch:wallet:${data.staffId}`);
      logger.info('History retrieved event emitted', data);
    } catch (error) {
      logger.error('History retrieved event failed', { error: error.message, data });
    }
  });

  socket.on('munch:wallet:withdrawal_requested', (data) => {
    try {
      socketService.emit(io, 'wallet:withdrawal_requested', {
        staffId: data.staffId,
        amount: data.amount,
        payoutId: data.payoutId,
      }, `munch:wallet:${data.staffId}`);
      logger.info('Withdrawal requested event emitted', data);
    } catch (error) {
      logger.error('Withdrawal requested event failed', { error: error.message, data });
    }
  });

  socket.on('munch:wallet:merchant_synced', (data) => {
    try {
      socketService.emit(io, 'wallet:merchant_synced', {
        staffId: data.staffId,
        merchantId: data.merchantId,
      }, `munch:wallet:${data.staffId}`);
      logger.info('Merchant synced event emitted', data);
    } catch (error) {
      logger.error('Merchant synced event failed', { error: error.message, data });
    }
  });

  socket.on('munch:wallet:preferences_updated', (data) => {
    try {
      socketService.emit(io, 'wallet:preferences_updated', {
        staffId: data.staffId,
        preferences: data.preferences,
      }, `munch:wallet:${data.staffId}`);
      logger.info('Preferences updated event emitted', data);
    } catch (error) {
      logger.error('Preferences updated event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch wallet', { socketId: socket.id });
    setupWalletEvents(io, socket);
  });
}

module.exports = { initialize };