'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupInventoryEvents = (io, socket) => {
  socket.on('merchant:munch:stockLevels', (data) => {
    logger.info('Stock levels event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.STOCK_LEVELS_UPDATED, data);
  });

  socket.on('merchant:munch:inventoryUpdated', (data) => {
    logger.info('Inventory updated event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.INVENTORY_UPDATED, data);
  });

  socket.on('merchant:munch:restockingAlerts', (data) => {
    logger.info('Restocking alerts event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.RESTOCKING_ALERT, data);
  });
};

module.exports = { setupInventoryEvents };