// orderHandler.js
// Handles socket event emissions for staff munch order operations.

'use strict';

const socketService = require('@services/common/socketService');
const orderEvents = require('@socket/events/staff/munch/orderEvents');

function setupSocketHandlers(io) {
  return {
    emitOrderConfirmed: (data, room) => {
      socketService.emit(io, orderEvents.ORDER_CONFIRMED, data, room);
    },
    emitOrderPreparing: (data, room) => {
      socketService.emit(io, orderEvents.ORDER_PREPARING, data, room);
    },
    emitOrderCompleted: (data, room) => {
      socketService.emit(io, orderEvents.ORDER_COMPLETED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };