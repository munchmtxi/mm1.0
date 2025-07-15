// messagingHandler.js
// Handles socket event emissions for staff communication operations.

'use strict';

const socketService = require('@services/common/socketService');
const messagingEvents = require('@socket/events/staff/communication/messagingEvents');

function setupSocketHandlers(io) {
  return {
    emitMessageReceived: (data, room) => {
      socketService.emit(io, messagingEvents.MESSAGE_RECEIVED, data, room);
    },
    emitAnnouncementBroadcast: (data, room) => {
      socketService.emit(io, messagingEvents.ANNOUNCEMENT_BROADCAST, data, room);
    },
    emitLogsRetrieved: (data, room) => {
      socketService.emit(io, messagingEvents.LOGS_RETRIEVED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };