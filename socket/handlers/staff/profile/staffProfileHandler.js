// staffProfileHandler.js
// Handles socket event emissions for staff profile operations.

'use strict';

const socketService = require('@services/common/socketService');
const staffProfileEvents = require('@socket/events/staff/profile/staffProfileEvents');

function setupSocketHandlers(io) {
  return {
    emitProfileCreated: (data, room) => {
      socketService.emit(io, staffProfileEvents.PROFILE_CREATED, data, room);
    },
    emitProfileUpdated: (data, room) => {
      socketService.emit(io, staffProfileEvents.PROFILE_UPDATED, data, room);
    },
    emitComplianceVerified: (data, room) => {
      socketService.emit(io, staffProfileEvents.COMPLIANCE_VERIFIED, data, room);
    },
    emitComplianceFailed: (data, room) => {
      socketService.emit(io, staffProfileEvents.COMPLIANCE_FAILED, data, room);
    },
    emitProfileRetrieved: (data, room) => {
      socketService.emit(io, staffProfileEvents.PROFILE_RETRIEVED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };