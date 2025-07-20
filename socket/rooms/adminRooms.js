'use strict';

/**
 * socket/rooms/adminRooms.js
 *
 * Manages admin room joining for all services.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const getAdminRoom = (service) => `mm:admin:${service}`;

const joinAdminRoom = async (io, socket, user) => {
  try {
    if (user.role !== 'admin' || !user.service) {
      logger.warn('Admin room join failed: Invalid user or service', { userId: user.id, service: user.service });
      throw new AppError('Invalid user or service', 400, 'INVALID_ADMIN_DATA');
    }
    const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
    if (!validServices.includes(user.service)) {
      logger.warn('Invalid service for admin room', { userId: user.id, service: user.service });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    const room = getAdminRoom(user.service);
    await socket.join(room);
    logger.info('Admin joined room', { userId: user.id, room, service: user.service });
    return room;
  } catch (error) {
    logger.error('Failed to join admin room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinAdminRoom, getAdminRoom };