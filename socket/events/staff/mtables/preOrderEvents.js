'use strict';

/**
 * preOrderEvents.js
 * Socket events for mtables pre-order operations (staff role).
 * Keywords: preorder, created, status_updated, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupPreOrderEvents(io, socket) {
  socket.on('mtables:preorder:created', (data) => {
    try {
      socketService.emit(io, 'preorder:created', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        userId: data.customerId,
      }, `mtables:preorder:${data.customerId}`);
      logger.info('Pre-order created event emitted', data);
    } catch (error) {
      logger.error('Pre-order created event failed', error.message, data);
    }
  });

  socket.on('mtables:preorder:status_updated', (data) => {
    try {
      socketService.emit(io, 'preorder:status_updated', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `mtables:preorder:${data.customerId}`);
      logger.info('Pre-order status updated event emitted', data);
    } catch (error) {
      logger.error('Pre-order status updated event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Pre-order points awarded event emitted', data);
    } catch (error) {
      logger.error('Pre-order points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables pre-order', socket.id);
    setupPreOrderEvents(io, socket);
  });
}

module.exports = { initialize };