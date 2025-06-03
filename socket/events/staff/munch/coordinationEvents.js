'use strict';

/**
 * coordinationEvents.js
 * Socket events for munch coordination operations (staff role).
 * Keywords: coordination, pickup_coordinated, credentials_verified, pickup_logged, points, customer, driver, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupCoordinationEvents(io, socket) {
  socket.on('munch:coordination:pickup_coordinated', (data) => {
    try {
      socketService.emit(io, 'coordination:pickup_coordinated', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        driverId: data.driverId,
        userId: data.customerId,
      }, `munch:coordination:${data.orderId}`);
      logger.info('Pickup coordinated event emitted', data);
    } catch (error) {
      logger.error('Pickup coordinated event failed', error.message, data);
    }
  });

  socket.on('munch:coordination:credentials_verified', (data) => {
    try {
      socketService.emit(io, 'coordination:credentials_verified', {
        driverId: data.driverId,
        verificationId: data.verificationId,
      }, `munch:coordination:driver:${data.driverId}`);
      logger.info('Credentials verified event emitted', data);
    } catch (error) {
      logger.error('Credentials verified event failed', error.message, data);
    }
  });

  socket.on('munch:coordination:pickup_logged', (data) => {
    try {
      socketService.emit(io, 'coordination:pickup_logged', {
        orderId: data.orderId,
        timeTrackingId: data.timeTrackingId,
        pickupTime: data.pickupTime,
        userId: data.customerId,
      }, `munch:coordination:${data.orderId}`);
      logger.info('Pickup logged event emitted', data);
    } catch (error) {
      logger.error('Pickup logged event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Coordination points awarded event emitted', data);
    } catch (error) {
      logger.error('Coordination points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch coordination', socket.id);
    setupCoordinationEvents(io, socket);
  });
}

module.exports = { initialize };