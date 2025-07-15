'use strict';

const bookingEvents = require('@socket/events/admin/mtables/bookingEvents');
const logger = require('@utils/logger');

function setupBookingHandlers(io, socket) {
  socket.on(bookingEvents.STATUS_UPDATED, (data) => {
    logger.info('Booking status updated event received', { data });
    socket.emit(bookingEvents.STATUS_UPDATED, data);
  });

  socket.on(bookingEvents.TABLE_REASSIGNED, (data) => {
    logger.info('Table reassigned event received', { data });
    socket.emit(bookingEvents.TABLE_REASSIGNED, data);
  });

  socket.on(bookingEvents.COMPLETED, (data) => {
    logger.info('Booking completed event received', { data });
    socket.emit(bookingEvents.COMPLETED, data);
  });
}

module.exports = {
  setupBookingHandlers,
};