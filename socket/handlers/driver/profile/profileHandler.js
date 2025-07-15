'use strict';

const profileEvents = require('@socket/events/driver/profile/profileEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeProfileHandlers(socket) {
  socket.on(profileEvents.PROFILE_UPDATED, (data) => {
    logger.info('Profile updated event received', { data });
    socketService.emitToRoom(`driver:${data.userId}`, profileEvents.PROFILE_UPDATED, data);
  });

  socket.on(profileEvents.CERTIFICATION_UPDATED, (data) => {
    logger.info('Certification updated event received', { data });
    socketService.emitToRoom(`driver:${data.userId}`, profileEvents.CERTIFICATION_UPDATED, data);
  });

  socket.on(profileEvents.PROFILE_RETRIEVED, (data) => {
    logger.info('Profile retrieved event received', { data });
    socketService.emitToRoom(`driver:${data.userId}`, profileEvents.PROFILE_RETRIEVED, data);
  });

  socket.on(profileEvents.PROFILE_VERIFIED, (data) => {
    logger.info('Profile verified event received', { data });
    socketService.emitToRoom(`driver:${data.userId}`, profileEvents.PROFILE_VERIFIED, data);
  });
}

module.exports = {
  initializeProfileHandlers,
};