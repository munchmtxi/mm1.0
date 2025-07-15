// accessControlHandler.js
// Handles socket event emissions for staff security operations.

'use strict';

const socketService = require('@services/common/socketService');
const accessControlEvents = require('@socket/events/staff/security/accessControlEvents');

function setupSocketHandlers(io) {
  return {
    emitAccessGranted: (data, room) => {
      socketService.emit(io, accessControlEvents.ACCESS_GRANTED, data, room);
    },
    emitAccessAudited: (data, room) => {
      socketService.emit(io, accessControlEvents.ACCESS_AUDITED, data, room);
    },
    emitRulesUpdated: (data, room) => {
      socketService.emit(io, accessControlEvents.RULES_UPDATED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };