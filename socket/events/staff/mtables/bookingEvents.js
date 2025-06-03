'use strict';

/**
 * bookingEvents.js
 * Socket events for mtables booking operations (staff role).
 * Keywords: booking, status_updated, waitlisted, waitlist_removed, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupBookingEvents(io, socket) {
  socket.on('mtables:booking:status_updated', (data) => {
    try {
      socketService.emit(io, 'booking:status_updated', {
        bookingId: data.bookingId,
        status: data.status,
        userId: data.customerId,
      }, `mtables:booking:${data.customerId}`);
      logger.info('Booking status updated event emitted', data);
    } catch (error) {
      logger.error('Booking status update event failed', error.message, data);
    }
  });

  socket.on('mtables:booking:waitlisted', (data) => {
    try {
      socketService.emit(io, 'booking:waitlisted', {
        bookingId: data.bookingId,
        waitlistPosition: data.waitlistPosition,
        userId: data.customerId,
      }, `mtables:booking:${data.customerId}`);
      logger.info('Booking waitlisted event emitted', data);
    } catch (error) {
      logger.error('Booking waitlisted event failed', error.message, data);
    }
  });

  socket.on('mtables:booking:waitlist_removed', (data) => {
    try {
      socketService.emit(io, 'booking:waitlist_removed', {
        bookingId: data.bookingId,
        userId: data.customerId,
      }, `mtables:booking:${data.customerId}`);
      logger.info('Booking waitlist removed event emitted', data);
    } catch (error) {
      logger.error('Booking waitlist removed event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Booking points awarded event emitted', data);
    } catch (error) {
      logger.error('Booking points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables booking', socket.id);
    setupBookingEvents(io, socket);
  });
}

module.exports = { initialize };