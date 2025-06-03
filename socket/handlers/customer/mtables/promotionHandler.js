'use strict';

const logger = require('@utils/logger');

const promotionHandler = (io, socket) => {
  socket.on('joinPromotionRoom', ({ promotionId }) => {
    const room = `promotion:${promotionId}`;
    socket.join(room);
    logger.info('User joined promotion room', { room, userId: socket.user_id });
  });

  socket.on('leavePromotionRoom', ({ promotionId }) => {
    const room = `promotion:${promotionId}`;
    socket.leave(room);
    logger.info('User left promotion room', { room, userId: socket.user_id });
  });
};

module.exports = promotionHandler;