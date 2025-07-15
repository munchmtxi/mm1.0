'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const walletEvents = require('@socket/events/customer/wallet/walletEvents');

function handleWalletEvents(io, socket) {
  socket.on(walletEvents.WALLET_CREATED, (data, callback) => {
    socketService.emit(io, walletEvents.WALLET_CREATED, data, `customer:${data.userId}`);
    logger.info('Wallet created event emitted', data);
    if (callback) callback({ success: true });
  });

  socket.on(walletEvents.WALLET_FUNDED, (data, callback) => {
    socketService.emit(io, walletEvents.WALLET_FUNDED, data, `customer:${data.userId}`);
    logger.info('Wallet funded event emitted', data);
    if (callback) callback({ success: true });
  });

  socket.on(walletEvents.WALLET_WITHDRAWN, (data, callback) => {
    socketService.emit(io, walletEvents.WALLET_WITHDRAWN, data, `customer:${data.userId}`);
    logger.info('Wallet withdrawn event emitted', data);
    if (callback) callback({ success: true });
  });

  socket.on(walletEvents.WALLET_PAYMENT_PROCESSED, (data, callback) => {
    socketService.emit(io, walletEvents.WALLET_PAYMENT_PROCESSED, data, `customer:${data.userId}`);
    logger.info('Wallet payment processed event emitted', data);
    if (callback) callback({ success: true });
  });

  socket.on(walletEvents.WALLET_REWARD_CREDITED, (data, callback) => {
    socketService.emit(io, walletEvents.WALLET_REWARD_CREDITED, data, `customer:${data.userId}`);
    logger.info('Wallet reward credited event emitted', data);
    if (callback) callback({ success: true });
  });
}

module.exports = { handleWalletEvents };