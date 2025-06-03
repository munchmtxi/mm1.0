'use strict';

const logger = require('@utils/logger');

const orderHandler = (io, socket) => {
  socket.on('joinOrderRoom', ({ orderId }) => {
    const room = `order:${orderId}`;
    socket.join(room);
    logger.info('User joined order room', { room, userId: socket.user_id });
  });

  socket.on('leaveOrderRoom', ({ orderId }) => {
    const room = `order:${orderId}`;
    socket.leave(room);
    logger.info('User left order room', { room, userId: socket.user_id });
  });
};

module.exports = orderHandler;