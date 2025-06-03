'use strict';

const logger = require('@utils/logger');

const supportHandler = (io, socket) => {
  socket.on('joinSupportRoom', ({ ticketId }) => {
    const room = `support:${ticketId}`;
    socket.join(room);
    logger.info('User joined support room', { room, userId: socket.user_id });
  });

  socket.on('leaveSupportRoom', ({ ticketId }) => {
    const room = `support:${ticketId}`;
    socket.leave(room);
    logger.info('User left support room', { room, userId: socket.user_id });
  });
};

module.exports = supportHandler;