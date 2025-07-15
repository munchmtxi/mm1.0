// supportHandler.js
// Handles socket event emissions for staff munch support operations.

'use strict';

const socketService = require('@services/common/socketService');
const supportEvents = require('@socket/events/staff/munch/supportEvents');

function setupSocketHandlers(io) {
  return {
    emitInquiryCreated: (data, room) => {
      socketService.emit(io, supportEvents.INQUIRY_CREATED, data, room);
    },
    emitIssueResolved: (data, room) => {
      socketService.emit(io, supportEvents.ISSUE_RESOLVED, data, room);
    },
    emitDisputeEscalated: (data, room) => {
      socketService.emit(io, supportEvents.DISPUTE_ESCALATED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };