'use strict';

/**
 * checkInEvents.js
 * Socket events for mtables check-in operations (staff role).
 * Keywords: checkin, confirmed, table_status, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupCheckInEvents(io, socket) {
  socket.on('mtables:checkin:confirmed', (data) => {
    try {
      socketService.emit(io, 'checkin:confirmed', {
        bookingId: data.bookingId,
        status: data.status,
        tableNumber: data.tableNumber,
        userId: data.customerId,
      }, `mtables:checkin:${data.customerId}`);
      logger.info('Check-in confirmed event emitted', data);
    } catch (error) {
      logger.error('Check-in confirmed event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Check-in points awarded event emitted', data);
    } catch (error) {
      logger.error('Check-in points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables check-in', socket.id);
    setupCheckInEvents(io, socket);
  });
}

module.exports = { initialize };