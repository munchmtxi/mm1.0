'use strict';

const logger = require('@utils/logger');

const eventHandler = (io, socket) => {
  socket.on('joinEventRoom', ({ eventId }) => {
    const room = `event:${eventId}`;
    socket.join(room);
    logger.info('User joined event room', { room, userId: socket.user_id });
  });

  socket.on('leaveEventRoom', ({ eventId }) => {
    const room = `event:${eventId}`;
    socket.leave(room);
    logger.info('User left event room', { room, userId: socket.user_id });
  });

  socket.on('joinEventChat', ({ eventId }) => {
    const room = `event:chat:${eventId}`;
    socket.join(room);
    logger.info('User joined event chat room', { room, userId: socket.user_id });
  });

  socket.on('leaveEventChat', ({ eventId }) => {
    const room = `event:chat:${eventId}`;
    socket.leave(room);
    logger.info('User left event chat room', { room, userId: socket.user_id });
  });
};

module.exports = eventHandler;