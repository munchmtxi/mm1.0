'use strict';

const logger = require('@utils/logger');

const eventTrackingHandler = (io, socket) => {
  socket.on('joinTrackingRoom', ({ customerId }) => {
    const room = `tracking:${customerId}`;
    socket.join(room);
    logger.info('User joined tracking room', { room, userId: socket.user_id });
  });

  socket.on('leaveTrackingRoom', ({ customerId }) => {
    const room = `tracking:${customerId}`;
    socket.leave(room);
    logger.info('User left tracking room', { room, userId: socket.user_id });
  });

  socket.on('joinEngagementRoom', ({ customerId }) => {
    const room = `tracking:engagement:${customerId}`;
    socket.join(room);
    logger.info('User joined engagement room', { room, userId: socket.user_id });
  });

  socket.on('leaveEngagementRoom', ({ customerId }) => {
    const room = `tracking:engagement:${customerId}`;
    socket.leave(room);
    logger.info('User left engagement room', { room, userId: socket.user_id });
  });
};

module.exports = eventTrackingHandler;