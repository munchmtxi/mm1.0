'use strict';

/**
 * deliveryEvents.js
 * Socket events for munch delivery operations (staff role).
 * Keywords: delivery, assigned, package_ready, driver_status, points, customer, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupDeliveryEvents(io, socket) {
  socket.on('munch:delivery:assigned', (data) => {
    try {
      socketService.emit(io, 'delivery:assigned', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        driverId: data.driverId,
        userId: data.customerId,
      }, `munch:delivery:${data.orderId}`);
      logger.info('Delivery assigned event emitted', data);
    } catch (error) {
      logger.error('Delivery assigned event failed', error.message, data);
    }
  });

  socket.on('munch:delivery:package_ready', (data) => {
    try {
      socketService.emit(io, 'delivery:package_ready', {
        orderId: data.orderId,
        status: data.status,
        userId: data.customerId,
      }, `munch:delivery:${data.orderId}`);
      logger.info('Delivery package ready event emitted', data);
    } catch (error) {
      logger.error('Delivery package ready event failed', error.message, data);
    }
  });

  socket.on('munch:delivery:driver_status', (data) => {
    try {
      socketService.emit(io, 'driver:status', {
        driverId: data.driverId,
        location: data.location,
        status: data.status,
        lastUpdated: data.lastUpdated,
      }, `munch:delivery:${data.orderId}`);
      logger.info('Driver status event emitted', data);
    } catch (error) {
      logger.error('Driver status event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Delivery points awarded event emitted', data);
    } catch (error) {
      logger.error('Delivery points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch delivery', socket.id);
    setupDeliveryEvents(io, socket);
  });
}

module.exports = { initialize };