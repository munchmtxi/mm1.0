'use strict';

const disputeEvents = require('@socket/events/admin/mtables/disputeEvents');
const logger = require('@utils/logger');

function setupDisputeHandlers(io, socket) {
  socket.on(disputeEvents.RESOLVED, (data) => {
    logger.info('Booking dispute resolved event received', { data });
    socket.emit(disputeEvents.RESOLVED, data);
  });

  socket.on(disputeEvents.PRE_ORDER_RESOLVED, (data) => {
    logger.info('Pre-order dispute resolved event received', { data });
    socket.emit(disputeEvents.PRE_ORDER_RESOLVED, data);
  });

  socket.on(disputeEvents.STATUS_UPDATED, (data) => {
    logger.info('Dispute status updated event received', { data });
    socket.emit(disputeEvents.STATUS_UPDATED, data);
  });

  socket.on(disputeEvents.ESCALATED, (data) => {
    logger.info('Dispute escalated event received', { data });
    socket.emit(disputeEvents.ESCALATED, data);
  });
}

module.exports = {
  setupDisputeHandlers,
};