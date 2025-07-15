// supplyHandler.js
// Handles socket event emissions for staff mtables supply operations.

'use strict';

const socketService = require('@services/common/socketService');
const supplyEvents = require('@socket/events/staff/mtables/supplyEvents');

function setupSocketHandlers(io) {
  return {
    emitSuppliesMonitored: (data, room) => {
      socketService.emit(io, supplyEvents.SUPPLIES_MONITORED, data, room);
    },
    emitRestockRequested: (data, room) => {
      socketService.emit(io, supplyEvents.RESTOCK_REQUESTED, data, room);
    },
    emitReadinessLogged: (data, room) => {
      socketService.emit(io, supplyEvents.READINESS_LOGGED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };