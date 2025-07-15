'use strict';

const socketService = require('@services/common/socketService');
const munchConstants = require('@constants/common/munchConstants');
const logger = require('@utils/logger');

const setupDeliveryEvents = (io, socket) => {
  socket.on('merchant:munch:deliveryAssigned', (data) => {
    logger.info('Delivery assigned event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DELIVERY_ASSIGNED, data);
  });

  socket.on('merchant:munch:deliveryStatusUpdated', (data) => {
    logger.info('Delivery status updated event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DELIVERY_STATUS_UPDATED, data);
  });

  socket.on('merchant:munch:driverCommunication', (data) => {
    logger.info('Driver communication event received', { data });
    socketService.emit(socket.id, munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION, data);
  });
};

module.exports = { setupDeliveryEvents };