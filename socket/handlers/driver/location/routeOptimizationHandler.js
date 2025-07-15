'use strict';

const routeOptimizationEvents = require('@socket/events/driver/location/routeOptimizationEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeRouteOptimizationHandlers(socket) {
  socket.on(routeOptimizationEvents.ROUTE_CALCULATED, (data) => {
    logger.info('Route calculated event received', { data });
    socketService.emit(null, routeOptimizationEvents.ROUTE_CALCULATED, data);
  });

  socket.on(routeOptimizationEvents.ROUTE_UPDATED, (data) => {
    logger.info('Route updated event received', { data });
    socketService.emit(null, routeOptimizationEvents.ROUTE_UPDATED, data);
  });

  socket.on(routeOptimizationEvents.ROUTE_DETAILS_RETRIEVED, (data) => {
    logger.info('Route details retrieved event received', { data });
    socketService.emit(null, routeOptimizationEvents.ROUTE_DETAILS_RETRIEVED, data);
  });
}

module.exports = {
  initializeRouteOptimizationHandlers,
};