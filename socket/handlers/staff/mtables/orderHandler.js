// orderHandler.js
// Handles socket event emissions for staff mtables order operations.

'use strict';

const socketService = require('@services/common/socketService');
const orderEvents = require('@socket/events/staff/mtables/orderEvents');

function setupSocketHandlers(io) {
  return {
    emitOrderCreated: (data, room) => {
      socketService.emit(io, orderEvents.ORDER_CREATED, data, room);
    },
    emitOrderStatusUpdated: (data, room) => {
      socketService.emit(io, orderEvents.ORDER_STATUS_UPDATED, data, room);
    },
    emitMetricsLogged: (data, room) => {
      socketService.emit(io, orderEvents.METRICS_LOGGED, data, room);
    },
  };
}

module.exports = { setupSocketHandlers };