// preOrderHandler.js
// Handles socket event emissions for staff mtables pre-order operations.

'use strict';

const socketService = require('@services/common/socketService');
const preOrderEvents = require('@socket/events/staff/mtables/preOrderEvents');

function setupSocketHandlers(io) {
  return {
    emitPreOrderCreated: (data, room) => {
      socketService.emit(io, preOrderEvents.PREORDER_CREATED, data, room);
    },
    emitPreOrderStatusUpdated: (data, room) => {
      socketService.emit(io, preOrderEvents.PREORDER_STATUS_UPDATED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };