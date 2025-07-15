// deliveryHandler.js
// Handles socket event emissions for staff munch delivery operations.

'use strict';

const socketService = require('@services/common/socketService');
const deliveryEvents = require('@socket/events/staff/munch/deliveryEvents');

function setupSocketHandlers(io) {
  return {
    emitDriverAssigned: (data, room) => {
      socketService.emit(io, deliveryEvents.DRIVER_ASSIGNED, data, room);
    },
    emitPackageReady: (data, room) => {
      socketService.emit(io, deliveryEvents.PACKAGE_READY, data, room);
    },
    emitDriverStatus: (data, room) => {
      socketService.emit(io, deliveryEvents.DRIVER_STATUS, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };