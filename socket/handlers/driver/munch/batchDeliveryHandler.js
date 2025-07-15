'use strict';

const batchDeliveryEvents = require('@socket/events/driver/munch/batchDeliveryEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeBatchDeliveryHandlers(socket) {
  socket.on(batchDeliveryEvents.BATCH_DELIVERY_CREATED, (data) => {
    logger.info('Batch delivery created event received', { data });
    socketService.emit(null, batchDeliveryEvents.BATCH_DELIVERY_CREATED, data);
  });

  socket.on(batchDeliveryEvents.BATCH_DELIVERY_STATUS_UPDATED, (data) => {
    logger.info('Batch delivery status updated event received', { data });
    socketService.emit(null, batchDeliveryEvents.BATCH_DELIVERY_STATUS_UPDATED, data);
  });

  socket.on(batchDeliveryEvents.BATCH_DELIVERY_ROUTE_UPDATED, (data) => {
    logger.info('Batch delivery route updated event received', { data });
    socketService.emit(null, batchDeliveryEvents.BATCH_DELIVERY_ROUTE_UPDATED, data);
  });

  socket.on(batchDeliveryEvents.BATCH_DELIVERY_DETAILS_RETRIEVED, (data) => {
    logger.info('Batch delivery details retrieved event received', { data });
    socketService.emit(null, batchDeliveryEvents.BATCH_DELIVERY_DETAILS_RETRIEVED, data);
  });
}

module.exports = {
  initializeBatchDeliveryHandlers,
};