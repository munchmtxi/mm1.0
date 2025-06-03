'use strict';

/**
 * supplyEvents.js
 * Socket events for mtables supply operations (staff role).
 * Keywords: supply, monitored, restock_requested, readiness_logged, points, staff, branch.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupSupplyEvents(io, socket) {
  socket.on('mtables:supply:monitored', (data) => {
    try {
      socketService.emit(io, 'supply:monitored', {
        restaurantId: data.restaurantId,
        lowStockItems: data.lowStockItems,
      }, `mtables:supply:${data.id}`);
      logger.info('Supply monitored event emitted', data);
    } catch (error) {
      logger.error('Supply monitored event failed', error.message, data);
    }
  });

  socket.on('mtables:supply:restock_requested', (data) => {
    try {
      socketService.emit(io, 'supply:restock_requested', {
        restaurantId: data.restaurantId,
        itemCount: data.itemCount,
      }, `mtables:supply:${data.restaurantId}`);
      logger.info('Supply restock requested event emitted', data);
    } catch (error) {
      logger.error('Supply restock requested event failed', error.message, data);
    }
  });

  socket.on('mtables:supply:readiness_logged', (data) => {
    try {
      socketService.emit(io, 'supply:readiness_logged', {
        restaurantId: data.restaurantId,
        status: data.status,
      }, `mtables:supply:${data.restaurantId}`);
      logger.info('Supply readiness logged event emitted', data);
    } catch (error) {
      logger.error('Supply readiness logged event failed', error.message, data);
    }
  });

  socket.on('mtables:staff:points', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `mtables:staff:${data.staffId}`);
      logger.info('Supply points awarded event emitted', data);
    } catch (error) {
      logger.error('Supply points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for mtables supply', socket.id);
    setupSupplyEvents(io, socket);
  });
}

module.exports = { initialize };
}