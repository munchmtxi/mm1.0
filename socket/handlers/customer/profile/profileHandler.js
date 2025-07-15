'use strict';

/**
 * Handles profile-related socket events for customers.
 */

const profileEvents = require('@socket/events/customer/profile/profileEvents');
const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');

module.exports = (io, socket) => {
  socket.on(profileEvents.PROFILE_UPDATED, (data) => {
    logger.info('Profile updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(profileEvents.PROFILE_UPDATED, data);
  });

  socket.on(profileEvents.COUNTRY_SET, (data) => {
    logger.info('Country set event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(profileEvents.COUNTRY_SET, data);
  });

  socket.on(profileEvents.LANGUAGE_SET, (data) => {
    logger.info('Language set event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(profileEvents.LANGUAGE_SET, data);
  });

  socket.on(profileEvents.DIETARY_PREFERENCES_SET, (data) => {
    logger.info('Dietary preferences set event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(profileEvents.DIETARY_PREFERENCES_SET, data);
  });

  socket.on(profileEvents.DEFAULT_ADDRESS_SET, (data) => {
    logger.info('Default address set event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(profileEvents.DEFAULT_ADDRESS_SET, data);
  });
};