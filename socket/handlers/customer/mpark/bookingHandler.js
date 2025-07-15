'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

/**
 * Handle booking-related socket events.
 */
module.exports = (io, socket) => {
  socket.on('PARKING_BOOKING_CREATED', (data) => {
    logger.info('Booking created event received', { data });
    socketService.emit(io, 'PARKING_BOOKING_CREATED', data, `customer:${data.userId}`);
  });

  socket.on('PARKING_BOOKING_CANCELLED', (data) => {
    logger.info('Booking cancelled event received', { data });
    socketService.emit(io, 'PARKING_BOOKING_CANCELLED', data, `customer:${data.userId}`);
  });

  socket.on('PARKING_TIME_EXTENDED', (data) => {
    logger.info('Booking extended event received', { data });
    socketService.emit(io, 'PARKING_TIME_EXTENDED', data, `customer:${data.userId}`);
  });

  socket.on('PARKING_CHECKED_IN', (data) => {
    logger.info('Booking checked-in event received', { data });
    socketService.emit(io, 'PARKING_CHECKED_IN', data, `customer:${data.userId}`);
  });
};