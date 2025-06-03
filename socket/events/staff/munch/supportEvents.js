'use strict';

/**
 * supportEvents.js
 * Socket events for munch support operations (staff role).
 * Keywords: support, inquiry_created, resolved, escalated, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupSupportEvents(io, socket) {
  socket.on('munch:support:inquiry_created', (data) => {
    try {
      socketService.emit(io, 'support:inquiry_created', {
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        status: data.status,
        userId: data.customerId,
      }, `munch:support:${data.customerId}`);
      logger.info('Support inquiry created event emitted', data);
    } catch (error) {
      logger.error('Support inquiry created event failed', error.message, data);
    }
  });

  socket.on('munch:support:resolved', (data) => {
    try {
      socketService.emit(io, 'support:resolved', {
        ticketId: data.ticketId,
        status: data.status,
        userId: data.customerId,
      }, `munch:support:${data.customerId}`);
      logger.info('Support resolved event emitted', data);
    } catch (error) {
      logger.error('Support resolved event failed', error.message, data);
    }
  });

  socket.on('munch:support:escalated', (data) => {
    try {
      socketService.emit(io, 'support:escalated', {
        ticketId: data.ticketId,
        disputeId: data.disputeId,
        status: data.status,
        userId: data.customerId,
      }, `munch:support:${data.customerId}`);
      logger.info('Support escalated event emitted', data);
    } catch (error) {
      logger.error('Support escalated event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Support points awarded event emitted', data);
    } catch (error) {
      logger.error('Support points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch support', socket.id);
    setupSupportEvents(io, socket);
  });
}

module.exports = { initialize };