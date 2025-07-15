// checkInHandler.js
// Handles socket event emissions for staff mtables check-in operations.

'use strict';

const socketService = require('@services/common/socketService');
const checkInEvents = require('@socket/events/staff/mtables/checkInEvents');

function setupSocketHandlers(io) {
  return {
    emitCheckInConfirmed: (data, room) => {
      socketService.emit(io, checkInEvents.CHECKIN_CONFIRMED, data, room);
    },
    emitTimeLogged: (data, room) => {
      socketService.emit(io, checkInEvents.TIME_LOGGED, data, room);
    },
    emitTableStatusUpdated: (data, room) => {
      socketService.emit(io, checkInEvents.TABLE_STATUS_UPDATED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };