'use strict';

const logger = require('@utils/logger');

const bookingHandler = (io, socket) => {
  socket.on('joinBookingRoom', ({ bookingId }) => {
    const room = `booking:${bookingId}`;
    socket.join(room);
    logger.info('User joined booking room', { room, userId: socket.user_id });
  });

  socket.on('leaveBookingRoom', ({ bookingId }) => {
    const room = `booking:${bookingId}`;
    socket.leave(room);
    logger.info('User left booking room', { room, userId: socket.user_id });
  });
};

module.exports = bookingHandler;