'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/common/authConstants');

const joinAuthRooms = async (socket, role) => {
  try {
    if (!authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes(role)) {
      logger.warn('Invalid role for room join', { role });
      throw new AppError('Invalid role', 400, authConstants.ERROR_CODES.INVALID_ROLE);
    }
    const room = `role:${role}`;
    socket.join(room);
    logger.info('User joined auth room', { socketId: socket.id, role, room });
  } catch (error) {
    logger.logErrorEvent('Failed to join auth room', { error: error.message });
    throw error;
  }
};

const leaveAuthRooms = async (socket, role) => {
  try {
    const room = `role:${role}`;
    socket.leave(room);
    logger.info('User left auth room', { socketId: socket.id, role, room });
  } catch (error) {
    logger.logErrorEvent('Failed to leave auth room', { error: error.message });
    throw error;
  }
};

module.exports = { joinAuthRooms, leaveAuthRooms };