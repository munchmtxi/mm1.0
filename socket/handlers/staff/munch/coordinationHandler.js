// coordinationHandler.js
// Handles socket event emissions for staff munch coordination operations.

'use strict';

const socketService = require('@services/common/socketService');
const coordinationEvents = require('@socket/events/staff/munch/coordinationEvents');

function setupSocketHandlers(io) {
  return {
    emitPickupCoordinated: (data, room) => {
      socketService.emit(io, coordinationEvents.PICKUP_COORDINATED, data, room);
    },
    emitCredentialsVerified: (data, room) => {
      socketService.emit(io, coordinationEvents.CREDENTIALS_VERIFIED, data, room);
    },
    emitPickupLogged: (data, room) => {
      socketService.emit(io, coordinationEvents.PICKUP_LOGGED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };