'use strict';

const logger = require('@utils/logger');

const setupDriverRooms = (socket, io) => {
  const joinDriverRoom = async (userId) => {
    const room = `driver:${userId}`;
    socket.join(room);
    logger.info('Driver joined room', { userId, room });
  };

  const leaveDriverRoom = async (userId) => {
    const room = `driver:${userId}`;
    socket.leave(room);
    logger.info('Driver left room', { userId, room });
  };

  return { joinDriverRoom, leaveDriverRoom };
};

module.exports = { setupDriverRooms };