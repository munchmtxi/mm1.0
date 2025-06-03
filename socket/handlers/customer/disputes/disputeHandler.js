'use strict';

const logger = require('@utils/logger');

const disputeHandler = (io, socket) => {
  socket.on('joinDisputeRoom', ({ customerId }) => {
    const room = `dispute:${customerId}`;
    socket.join(room);
    logger.info('User joined dispute room', { room, userId: socket.user?.id });
  });

  socket.on('leaveDisputeRoom', ({ customerId }) => {
    const room = `dispute:${customerId}`;
    socket.leave(room);
    logger.info('User left dispute room', { room, userId: socket.user?.id });
  });
};

module.exports = disputeHandler;