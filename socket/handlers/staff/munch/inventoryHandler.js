// inventoryHandler.js
// Handles socket event emissions for staff munch inventory operations.

'use strict';

const socketService = require('@services/common/socketService');
const events = require('@socket/events/staff/munch/inventoryEvents');

function setupSocketHandlers(io) {
  return {
    emitInventoryTracked: (data, room) => {
      socketService.emit(io, events.INVENTORY_TRACKED, data, room),
    },
    emitRestockAlert: (data, room) => {
      socketService.emit(io, events.RESTOCK_ALERT, data, room),
    }),
    emitInventoryUpdated: (data, room) => {
      socketService.emit(io, events.INVENTORY_UPDATED, data, room),
    }),
  };
}

module.exports = { setupSocketHandlers };