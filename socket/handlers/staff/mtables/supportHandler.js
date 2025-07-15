// supportHandler.js
// Handles socket event emissions for staff mtables support operations.

'use strict';

const socketService = require('@services/common/socketService');
const supportEvents = require('@socket/events/staff/mtables/supportEvents');

function setupSocketHandlers(io) {
  return {
    emitSupportRequestCreated: (data, room) => {
      socketService.emit(io, supportEvents.SUPPORT_REQUEST_CREATED, data, room);
    },
    emitSupportEscalated: (data, room) => {
      socketService.emit(io, supportEvents.SUPPORT_ESCALATED, data, room);
    },
    emitSupportResolved: (data, room) => {
      socketService.emit(io, supportEvents.SUPPORT_RESOLVED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };