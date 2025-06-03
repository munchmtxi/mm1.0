'use strict';

/**
 * orderEvents.js
 * Socket events for munch order operations (staff role).
 * Keywords: order, confirmed, preparing, completed, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupOrderEvents(io, socket) {
  socket.on('munch:order:confirmed', (data) => {
    try {
      socketService.emit(io, 'order:confirmed', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `munch:order:${data.orderId}`);
      logger.info('Order confirmed event emitted', data);
    } catch (error) {
      logger.error('Order confirmed event failed', error.message, data);
    }
  });

  socket.on('munch:order:preparing', (data) => {
    try {
      socketService.emit(io, 'order:preparing', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `munch:order:${data.orderId}`);
      logger.info('Order preparing event emitted', data);
    } catch (error) {
      logger.error('Order preparing event failed', error.message, data);
    }
  });

  socket.on('munch:order:completed', (data) => {
    try {
      socketService.emit(io, 'order:completed', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `munch:order:${data.orderId}`);
      logger.info('Order completed event emitted', data);
    } catch (error) {
      logger.error('Order completed event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Order points awarded event emitted', data);
    } catch (error) {
      logger.error('Order points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch order', socket.id);
    setupOrderEvents(io, socket);
  });
}

module.exports = { initialize };