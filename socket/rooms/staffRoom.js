'use strict';
const logger = require('@utils/logger');

module.exports = (io, socket, user) => {
  if (user.role === 'staff' && user.merchant_id) {
    const room = `merchant:${user.merchant_id}`;
    socket.join(room);
    logger.info('Staff joined merchant room', { userId: user.id, room });
  } else {
    logger.warn('Staff room join failed: Invalid user or merchant_id', { userId: user.id });
  }
};