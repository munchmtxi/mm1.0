'use strict';

const logger = require('@utils/logger');

/** Handles analytics-related socket events */
const analyticsHandler = (io, socket) => {
  socket.on('joinAnalyticsRoom', ({ customerId }) => {
    const room = `customer:${customerId}`;
    socket.join(room);
    logger.info('User joined analytics room', { room, userId: socket.user?.id });
  });

  socket.on('leaveAnalyticsRoom', ({ customerId }) => {
    const room = `customer:${customerId}`;
    socket.leave(room);
    logger.info('User left analytics room', { room, userId: socket.user?.id });
  });
};

module.exports = analyticsHandler;