'use strict';

/**
 * socket/rooms/groupRooms.js
 *
 * Manages group room joining for mevents and munch services.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 * - constants/common/meventsConstants.js
 * - constants/common/munchConstants.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const meventsConstants = require('@constants/common/meventsConstants');
const munchConstants = require('@constants/common/munchConstants');

const getGroupRoom = (groupId, service) => `mm:group:${groupId}:${service}`;

const validateGroup = async (groupId, service) => {
  const constants = service === 'mevents' ? meventsConstants : munchConstants;
  // Placeholder: Replace with DB/cache check
  const validGroups = new Set(['group1', 'group2']); // Example IDs
  return validGroups.has(groupId); // Implement actual DB check
};

const joinGroupRoom = async (io, socket, user, groupId) => {
  try {
    if (!user.id || !user.service || !groupId) {
      logger.warn('Group room join failed: Invalid user or groupId', { userId: user.id, service: user.service, groupId });
      throw new AppError('Invalid user or groupId', 400, 'INVALID_GROUP_DATA');
    }
    const validServices = ['munch', 'mevents'];
    if (!validServices.includes(user.service)) {
      logger.warn('Invalid service for group room', { userId: user.id, service: user.service, groupId });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    if (!(await validateGroup(groupId, user.service))) {
      logger.warn('Invalid group', { userId: user.id, groupId, service: user.service });
      throw new AppError('Invalid group', 404, 'GROUP_NOT_FOUND');
    }
    const room = getGroupRoom(groupId, user.service);
    await socket.join(room);
    logger.info('User joined group room', { userId: user.id, room, service: user.service });

    // Cleanup: Leave room if no sockets remain after disconnect
    socket.on('disconnect', async () => {
      const roomSockets = await io.in(room).allSockets();
      if (roomSockets.size === 0) {
        logger.info('Cleaning up empty group room', { room, service: user.service });
        io.socketsLeave(room);
      }
    });
    return room;
  } catch (error) {
    logger.error('Failed to join group room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinGroupRoom, getGroupRoom };