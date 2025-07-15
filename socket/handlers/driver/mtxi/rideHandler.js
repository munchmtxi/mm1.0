'use strict';

const rideEvents = require('@socket/events/driver/mtxi/rideEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeRideHandlers(socket) {
  socket.on(rideEvents.RIDE_ACCEPTED, (data) => {
    logger.info('Ride accepted event received', { data });
    socketService.emit(null, rideEvents.RIDE_ACCEPTED, data);
  });

  socket.on(rideEvents.RIDE_STATUS_UPDATED, (data) => {
    logger.info('Ride status updated event received', { data });
    socketService.emit(null, rideEvents.RIDE_STATUS_UPDATED, data);
  });

  socket.on(rideEvents.RIDE_MESSAGE, (data) => {
    logger.info('Ride message event received', { data });
    socketService.emit(null, rideEvents.RIDE_MESSAGE, data);
  });

  socket.on(rideEvents.RIDE_DETAILS_RETRIEVED, (data) => {
    logger.info('Ride details retrieved event received', { data });
    socketService.emit(null, rideEvents.RIDE_DETAILS_RETRIEVED, data);
  });
}

module.exports = {
  initializeRideHandlers,
};