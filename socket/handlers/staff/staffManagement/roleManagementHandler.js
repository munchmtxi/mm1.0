// roleManagementHandler.js
// Handles socket event emissions for staff role management operations.

'use strict';

const socketService = require('@services/common/socketService');
const roleManagementEvents = require('@socket/events/staff/staffManagement/roleManagementEvents');

function setupSocketHandlers(io) {
  return {
    emitRoleAssigned: (data, room) => {
      socketService.emit(io, roleManagementEvents.ROLE_ASSIGNED, data, room);
    },
    emitPermissionsUpdated: (data, room) => {
      socketService.emit(io, roleManagementEvents.PERMISSIONS_UPDATED, data, room);
    },
    emitDetailsRetrieved: (data, room) => {
      socketService.emit(io, roleManagementEvents.DETAILS_RETRIEVED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };