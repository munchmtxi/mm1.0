// bookingHandler.js
// Handles socket event emissions for staff mtables operations.

'use strict';

const socketService = require('@services/common/socketService');
const bookingEvents = require('@socket/events/staff/mtables/bookingEvents');

function setupSocketHandlers(io) {
  return {
    emitStatusUpdated: (data, room) => {
      socketService.emit(io, bookingEvents.STATUS_UPDATED, data, room);
    },
    emitWaitlisted: (data, room) => {
      socketService.emit(io, bookingEvents.WAITLISTED, data, room);
    },
    emitWaitlistRemoved: (data, room) => {
      socketService.emit(io, bookingEvents.WAITLIST_REMOVED, data, room);
    },
    emitLogsRetrieved: (data, room) => {
      socketService.emit(io, bookingEvents.LOGS_RETRIEVED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };