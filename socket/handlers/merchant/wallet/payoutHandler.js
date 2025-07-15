// payoutHandler.js
// Handles socket event emissions for merchant payout operations.

'use strict';

const socketService = require('@services/common/socketService');
const payoutEvents = require('@socket/events/merchant/wallet/payoutEvents');

function setupPayoutHandlers(io) {
  return {
    emitSettingsConfigured: (data, room) => {
      socketService.emit(io, payoutEvents.SETTINGS_CONFIGURED, data, room);
    },
    emitPayoutProcessed: (data, room) => {
      socketService.emit(io, payoutEvents.PAYOUT_PROCESSED, data, room);
    },
    emitMethodVerified: (data, room) => {
      socketService.emit(io, payoutEvents.METHOD_VERIFIED, data, room);
    },
  };
}

module.exports = { setupPayoutHandlers };