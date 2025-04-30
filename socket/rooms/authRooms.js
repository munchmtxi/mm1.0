'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/common/authConstants');

const joinAuthRooms = async (socket, role) => {
  try {
    if (!Object.values(authConstants.ROLES).includes(role) && !socket.user.admin_access) {
      logger.warn('Invalid role for room join', { role });
      throw new AppError('Invalid role', 400, 'INVALID_ROLE');
    }
    const room = `role:${role}`;
    await socket.join(room);
    logger.info('User joined auth room', { socketId: socket.id, role, room });
  } catch (error) {
    logger.logErrorEvent('Failed to join auth room', { error: error.message });
    throw error;
  }
};

const leaveAuthRooms = async (socket, role) => {
  try {
    const room = `role:${role}`;
    await socket.leave(room);
    logger.info('User left auth room', { socketId: socket.id, role, room });
  } catch (error) {
    logger.logErrorEvent('Failed to leave auth room', { error: error.message });
    throw error;
  }
};

module.exports = { joinAuthRooms, leaveAuthRooms };