'use strict';

/**
 * socket/rooms/authRooms.js
 *
 * Manages role-based auth rooms for all services.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 * - constants/common/authConstants.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/common/authConstants');

const getAuthRoom = (role, service) => `mm:role:${role}:${service}`;

const joinAuthRoom = async (io, socket, user) => {
  try {
    if (!user.role || !user.service) {
      logger.warn('Auth room join failed: Invalid user or service', { userId: user.id, service: user.service });
      throw new AppError('Invalid user or service', 400, 'INVALID_AUTH_DATA');
    }
    const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
    if (!validServices.includes(user.service)) {
      logger.warn('Invalid service for auth room', { userId: user.id, service: user.service });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    if (!authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes(user.role)) {
      logger.warn('Invalid role for auth room', { userId: user.id, role: user.role, service: user.service });
      throw new AppError('Invalid role', 403, 'INVALID_ROLE');
    }
    const room = getAuthRoom(user.role, user.service);
    await socket.join(room);
    logger.info('User joined auth room', { userId: user.id, room, service: user.service });
    return room;
  } catch (error) {
    logger.error('Failed to join auth room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinAuthRoom, getAuthRoom };