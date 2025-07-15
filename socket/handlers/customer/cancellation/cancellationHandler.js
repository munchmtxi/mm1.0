'use strict';

/**
 * Socket handler for cancellation events.
 */
const cancellationEvents = require('@socket/events/customer/cancellation/cancellationEvents');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Handles cancellation socket events.
 */
const cancellationHandler = (io, socket) => {
  socket.on('joinCancellationRoom', ({ serviceType, serviceId }) => {
    if (!customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes(serviceType)) {
      logger.warn('Invalid service type for cancellation room', { serviceType, serviceId, userId: socket.user?.id });
      return;
    }
    const room = `cancellation:${serviceType}:${serviceId}`;
    socket.join(room);
    logger.info('User joined cancellation room', { room, userId: socket.user?.id });
  });

  socket.on('leaveCancellationRoom', ({ serviceType, serviceId }) => {
    if (!customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes(serviceType)) {
      logger.warn('Invalid service type for cancellation room', { serviceType, serviceId, userId: socket.user?.id });
      return;
    }
    const room = `cancellation:${serviceType}:${serviceId}`;
    socket.leave(room);
    logger.info('User left cancellation room', { room, userId: socket.user?.id });
  });
};

module.exports = cancellationHandler;