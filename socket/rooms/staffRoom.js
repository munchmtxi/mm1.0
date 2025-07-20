'use strict';

/**
 * socket/rooms/staffRoom.js
 *
 * Manages staff room joining for munch, mtickets, mtables, mstays, mpark, and mevents.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const getStaffRoom = (merchantId, service) => `mm:merchant-${merchantId}:${service}`;

const joinStaffRoom = async (io, socket, user) => {
  try {
    if (user.role !== 'staff' || !user.merchant_id || !user.service) {
      logger.warn('Staff room join failed: Invalid user, merchant_id, or service', { userId: user.id, service: user.service });
      throw new AppError('Invalid user, merchant_id, or service', 400, 'INVALID_STAFF_DATA');
    }
    const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
    if (!validServices.includes(user.service)) {
      logger.warn('Invalid service for staff room', { userId: user.id, service: user.service });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    const room = getStaffRoom(user.merchant_id, user.service);
    await socket.join(room);
    logger.info('Staff joined merchant room', { userId: user.id, room, service: user.service });
    return room;
  } catch (error) {
    logger.error('Failed to join staff room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinStaffRoom, getStaffRoom };