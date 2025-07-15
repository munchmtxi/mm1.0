'use strict';

const deliveryEvents = require('@socket/events/driver/munch/deliveryEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeDeliveryHandlers(socket) {
  socket.on(deliveryEvents.DELIVERY_ACCEPTED, (data) => {
    logger.info('Delivery accepted event received', { data });
    socketService.emit(null, deliveryEvents.DELIVERY_ACCEPTED, data);
  });

  socket.on(deliveryEvents.DELIVERY_STATUS_UPDATED, (data) => {
    logger.info('Delivery status updated event received', { data });
    socketService.emit(null, deliveryEvents.DELIVERY_STATUS_UPDATED, data);
  });

  socket.on(deliveryEvents.DELIVERY_MESSAGE, (data) => {
    logger.info('Delivery message event received', { data });
    socketService.emit(null, deliveryEvents.DELIVERY_MESSAGE, data);
  });

  socket.on(deliveryEvents.DELIVERY_DETAILS_RETRIEVED, (data) => {
    logger.info('Delivery details retrieved event received', { data });
    socketService.emit(null, deliveryEvents.DELIVERY_DETAILS_RETRIEVED, data);
  });
}

module.exports = {
  initializeDeliveryHandlers,
};