'use strict';

const sharedRideEvents = require('@socket/events/driver/mtxi/sharedRideEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeSharedRideHandlers(socket) {
  socket.on(sharedRideEvents.PASSENGER_ADDED, (data) => {
    logger.info('Passenger added event received', { data });
    socketService.emit(null, sharedRideEvents.PASSENGER_ADDED, data);
  });

  socket.on(sharedRideEvents.PASSENGER_REMOVED, (data) => {
    logger.info('Passenger removed event received', { data });
    socketService.emit(null, sharedRideEvents.PASSENGER_REMOVED, data);
  });

  socket.on(sharedRideEvents.ROUTE_UPDATED, (data) => {
    logger.info('Route updated event received', { data });
    socketService.emit(null, sharedRideEvents.ROUTE_UPDATED, data);
  });

  socket.on(sharedRideEvents.DETAILS_RETRIEVED, (data) => {
    logger.info('Shared ride details retrieved event received', { data });
    socketService.emit(null, sharedRideEvents.DETAILS_RETRIEVED, data);
  });
}

module.exports = {
  initializeSharedRideHandlers,
};