'use strict';

/**
 * socket/rooms/eventRooms.js
 *
 * Manages event room joining for mevents service.
 *
 * Dependencies:
 * - utils/logger.js
 * - utils/AppError.js
 * - constants/common/meventsConstants.js
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const meventsConstants = require('@constants/common/meventsConstants');

const getEventRoom = (eventId, service = 'mevents') => `mm:event:${eventId}:${service}`;

const validateEvent = async (eventId) => {
  // Placeholder: Replace with DB/cache check
  const validEvents = new Set(['event1', 'event2']); // Example IDs
  return validEvents.has(eventId); // Implement actual DB check using meventsConstants.EVENT_CONFIG
};

const joinEventRoom = async (io, socket, user, eventId) => {
  try {
    if (!user.id || !user.service || !eventId) {
      logger.warn('Event room join failed: Invalid user or eventId', { userId: user.id, service: user.service, eventId });
      throw new AppError('Invalid user or eventId', 400, 'INVALID_EVENT_DATA');
    }
    if (user.service !== 'mevents') {
      logger.warn('Invalid service for event room', { userId: user.id, service: user.service, eventId });
      throw new AppError('Invalid service', 400, 'INVALID_SERVICE');
    }
    if (!(await validateEvent(eventId))) {
      logger.warn('Invalid event', { userId: user.id, eventId, service: user.service });
      throw new AppError('Invalid event', 404, 'EVENT_NOT_FOUND');
    }
    const room = getEventRoom(eventId, user.service);
    await socket.join(room);
    logger.info('User joined event room', { userId: user.id, room, service: user.service });

    // Cleanup: Leave room if no sockets remain after disconnect
    socket.on('disconnect', async () => {
      const roomSockets = await io.in(room).allSockets();
      if (roomSockets.size === 0) {
        logger.info('Cleaning up empty event room', { room, service: user.service });
        io.socketsLeave(room);
      }
    });
    return room;
  } catch (error) {
    logger.error('Failed to join event room', { userId: user.id, error: error.message, service: user.service });
    throw error;
  }
};

module.exports = { joinEventRoom, getEventRoom };