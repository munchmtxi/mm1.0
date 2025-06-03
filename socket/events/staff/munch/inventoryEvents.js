'use strict';

/**
 * inventoryEvents.js
 * Socket events for munch inventory operations (staff role).
 * Keywords: inventory, tracked, restock_alert, updated, points, staff, branch.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupInventoryEvents(io, socket) {
  socket.on('munch:inventory:tracked', (data) => {
    try {
      socketService.emit(io, 'inventory:tracked', {
        restaurantId: data.restaurantId,
        lowStockItems: data.lowStockItems,
      }, `munch:inventory:${data.restaurantId}`);
      logger.info('Inventory tracked event emitted', data);
    } catch (error) {
      logger.error('Inventory tracked event failed', error.message, data);
    }
  });

  socket.on('munch:inventory:restock_alert', (data) => {
    try {
      socketService.emit(io, 'inventory:restock_alert', {
        restaurantId: data.restaurantId,
        itemCount: data.itemCount,
      }, `munch:inventory:${data.restaurantId}`);
      logger.info('Inventory restock alert event emitted', data);
    } catch (error) {
      logger.error('Inventory restock alert event failed', error.message, data);
    }
  });

  socket.on('munch:inventory:updated', (data) => {
    try {
      socketService.emit(io, 'inventory:updated', {
        orderId: data.orderId,
        itemCount: data.itemCount,
      }, `munch:inventory:${data.restaurantId}`);
      logger.info('Inventory updated event emitted', data);
    } catch (error) {
      logger.error('Inventory updated event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Inventory points awarded event emitted', data);
    } catch (error) {
      logger.error('Inventory points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch inventory', socket.id);
    setupInventoryEvents(io, socket);
  });
}

module.exports = { initialize };