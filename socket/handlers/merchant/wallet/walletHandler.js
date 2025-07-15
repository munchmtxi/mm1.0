// walletHandler.js
// Handles socket event emissions for merchant wallet operations.

'use strict';

const socketService = require('@services/common/socketService');
const walletEvents = require('@socket/events/merchant/wallet/walletEvents');

function setupWalletHandlers(io) {
  return {
    emitWalletCreated: (data, room) => {
      socketService.emit(io, walletEvents.WALLET_CREATED, data, room);
    },
    emitPaymentReceived: (data, room) => {
      socketService.emit(io, walletEvents.PAYMENT_RECEIVED, data, room);
    },
    emitPayoutDisbursed: (data, room) => {
      socketService.emit(io, walletEvents.PAYOUT_DISBURSED, data, room);
    },
  };
}

module.exports = { setupWalletHandlers };