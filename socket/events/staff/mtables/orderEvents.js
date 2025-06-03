'use strict';

/**
 * orderEvents.js
 * Socket events for mtables order operations (staff role).
 * Keywords: order, created, status_updated, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupOrderEvents(io, socket) {
  socket.on('mtables:order:created', (data) => {
    try {
      socketService.emit(io, 'order:created', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        userId: data.customerId,
      }, `mtables:order:${data.customerId}`);
      logger.info('Order created event emitted', data);
    } catch (error) {
      logger.error('Order created event failed', error.message, data);
    }
  });

  socket.on('mtables:order:status_updated', (data) => {
    try {
      socketService.emit(io, 'order:status_updated', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `mtables:order:${data.customerId}`);
      logger.info('Order status updated event emitted', data);
    } catch (error) {
      logger.error('Order status updated event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Order points awarded event emitted', data);
    } catch (error) {
      logger.error('Order points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables order', socket.id);
    setupOrderEvents(io, socket);
  });
}

module.exports = { initialize };