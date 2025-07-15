'use strict';

const preOrderEvents = require('@socket/events/admin/mtables/preOrderEvents');
const logger = require('@utils/logger');

function setupPreOrderEvents(io, socket) {
  socket.on(preOrderEvents.STATUS_UPDATED, (data) => {
    logger.info('Pre-order status updated event received', { data });
    socket.emit(preOrderEvents.STATUS_UPDATED, data);
  });

  socket.on(preOrderEvents.FRIEND_INVITED, (data) => {
    logger.info('Friend invited event received', { data });
    socket.emit(preOrderEvents.FRIEND_INVITED, data);
  });

  socket.on(preOrderEvents.PAYMENT_PROCESSED, (data) => {
    logger.info('Payment processed event received', { data });
    socket.emit(preOrderEvents.PAYMENT_PROCESSED, data);
  });
}

module.exports = {
  setupPreOrderEvents,
};