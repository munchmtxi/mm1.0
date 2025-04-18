'use strict';

const logger = require('@utils/logger');

const joinAdminRooms = async (socket, userId) => {
  try {
    const room = `admin:${userId}`;
    await socket.join(room);
    logger.info('Admin joined room', { userId, room });
  } catch (error) {
    logger.error('Failed to join admin rooms', { error: error.message, userId });
    throw error;
  }
};

const leaveAdminRooms = async (socket, userId) => {
  try {
    const room = `admin:${userId}`;
    await socket.leave(room);
    logger.info('Admin left room', { userId, room });
  } catch (error) {
    logger.error('Failed to leave admin rooms', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  joinAdminRooms,
  leaveAdminRooms,
};