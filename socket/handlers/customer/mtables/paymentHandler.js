'use strict';

const logger = require('@utils/logger');

const paymentHandler = (io, socket) => {
  socket.on('joinPaymentRoom', ({ paymentId }) => {
    const room = `payment:${paymentId}`;
    socket.join(room);
    logger.info('User joined payment room', { room, userId: socket.user_id });
  });

  socket.on('leavePaymentRoom', ({ paymentId }) => {
    const room = `payment:${paymentId}`;
    socket.leave(room);
    logger.info('User left payment room', { room, userId: socket.user_id });
  });
};

module.exports = paymentHandler;