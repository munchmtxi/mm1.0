'use strict';

/**
 * supportEvents.js
 * Socket events for mtables support operations (staff role).
 * Keywords: support, request_created, escalated, resolved, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupSupportEvents(io, socket) {
  socket.on('mtables:support:request_created', (data) => {
    try {
      socketService.emit(io, 'support:request_created', {
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        status: data.status,
        userId: data.customerId,
      }, `mtables:support:${data.customerId}`);
      logger.info('Support request created event emitted', data);
    } catch (error) {
      logger.error('Support request created event failed', error.message, data);
    }
  });

  socket.on('mtables:support:escalated', (data) => {
    try {
      socketService.emit(io, 'support:escalated', {
        ticketId: data.ticketId,
        status: data.status,
        userId: data.customerId,
      }, `mtables:support:${data.customerId}`);
      logger.info('Support escalated event emitted', data);
    } catch (error) {
      logger.error('Support escalated event failed', error.message, data);
    }
  });

  socket.on('mtables:support:resolved', (data) => {
    try {
      socketService.emit(io, 'support:resolved', {
        ticketId: data.ticketId,
        status: data.status,
        userId: data.customerId,
      }, `mtables:support:${data.customerId}`);
      logger.info('Support resolved event emitted', data);
    } catch (error) {
      logger.error('Support resolved event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Support points awarded event emitted', data);
    } catch (error) {
      logger.error('Support points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables support', socket.id);
    setupSupportEvents(io, socket);
  });
}

module.exports = { initialize };