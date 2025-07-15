'use strict';

/**
 * Handles privacy-related socket events for customers.
 */

const privacyEvents = require('@socket/events/customer/profile/privacyEvents');
const logger = require('@utils/logger');

module.exports = (io, socket) => {
  socket.on(privacyEvents.PRIVACY_SETTINGS_UPDATED, (data) => {
    logger.info('Privacy settings updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(privacyEvents.PRIVACY_SETTINGS_UPDATED, data);
  });

  socket.on(privacyEvents.DATA_ACCESS_UPDATED, (data) => {
    logger.info('Data access updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(privacyEvents.DATA_ACCESS_UPDATED, data);
  });
};