'use strict';

const cancellationEvents = require('@socket/events/customer/cancellation/cancellationEvents');
const logger = require('@utils/logger');

const cancellationHandler = (io, socket) => {
  socket.on('joinCancellationRoom', ({ serviceType, serviceId }) => {
    const room = `cancellation:${serviceType}:${serviceId}`;
    socket.join(room);
    logger.info('User joined cancellation room', { room, userId: socket.user?.id });
  });

  socket.on('leaveCancellationRoom', ({ serviceType, serviceId }) => {
    const room = `cancellation:${serviceType}:${serviceId}`;
    socket.leave(room);
    logger.info('User left cancellation room', { room, userId: socket.user?.id });
  });
};

module.exports = cancellationHandler;