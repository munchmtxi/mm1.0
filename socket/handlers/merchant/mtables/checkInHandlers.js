'use strict';

const checkInEvents = require('@socket/events/merchant/mtables/checkInEvents');
const logger = require('@utils/log');

function setupCheckInHandlers(io, socket) {
  socket.on(checkInEvents.CHECK_IN_PROCESSED, (data) => {
    logger.info('Check-in processed event received', { bookingId: data.bookingId });
    socket.to(`merchant:${data.branchId}`).emit(checkInEvents.CHECK_IN_PROCESSED, data);
  });

  socket.on(checkInEvents.TABLE_STATUS_UPDATED, (data) => {
    logger.info('Table status updated event received', { tableId: data.tableId });
    socket.to(`merchant:${data.branchId}`).emit(checkInEvents.TABLE_STATUS_UPDATED, data);
  });

  socket.on(checkInEvents.CHECK_IN_LOGGED, (data) => {
    logger.info('Check-in logged event received', { bookingId: data.bookingId });
    socket.to(`merchant:${data.branchId}`).emit(checkInEvents.CHECK_IN_LOGGED, data);
  });

  socket.on(checkInEvents.SUPPORT_REQUEST_HANDLED, (data) => {
    logger.info('Support request handled event received', { bookingId: data.bookingId });
    socket.to(`merchant:${data.branchId}`).emit(checkInEvents.SUPPORT_REQUEST_HANDLED, data);
  });
}

module.exports = { setupCheckInHandlers };