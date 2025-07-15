'use strict';

const bookingEvents = require('@socket/events/merchant/mtables/bookingEvents');
const logger = require('@utils/logger');

function setupBookingHandlers(io, socket) {
  socket.on(bookingEvents.BOOKING_CREATED, (data) => {
    logger.info('Booking created event received', { bookingId: data.bookingId });
    socket.to(`merchant:${data.branchId}`).emit(bookingEvents.BOOKING_CREATED, data);
  });

  socket.on(bookingEvents.WAITLIST_ADDED, (data) => {
    logger.info('Waitlist added event received', { waitlistId: data.waitlistId });
    socket.to(`merchant:${data.branchId}`).emit(bookingEvents.WAITLIST_ADDED, data);
  });

  socket.on(bookingEvents.POLICIES_UPDATED, (data) => {
    logger.info('Policies updated event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId).emit(bookingEvents.POLICIES_UPDATED, data);
  });

  socket.on(bookingEvents.BOOKING_UPDATED, (data) => {
    logger.info('Booking updated event received', { bookingId: data.bookingId });
    socket.to(`merchant:${data.branchId}`).emit(bookingEvents.BOOKING_UPDATED, data);
  });
}

module.exports = { setupBookingHandlers };