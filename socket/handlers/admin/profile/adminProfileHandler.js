'use strict';

const adminProfileService = require('@services/admin/profile/adminProfileService');
const adminProfileEvents = require('@socket/events/admin/profile/adminProfileEvents');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const adminConstants = require('@constants/admin/adminConstants');

const handleProfileUpdate = async (io, socket, data) => {
  try {
    const userId = socket.user.id;
    const profile = await adminProfileService.updatePersonalInfo(userId, data, socket.user);
    io.to(`admin:${userId}`).emit(adminProfileEvents.PROFILE_UPDATED, profile);
    logger.info('Admin profile updated via socket', { userId });
  } catch (error) {
    logger.error('Failed to update admin profile via socket', { error: error.message, userId: socket.user.id });
    socket.emit(adminProfileEvents.ERROR, {
      message: error.message,
      code: error.code || adminConstants.ERROR_CODES.PROFILE_UPDATE_FAILED,
    });
  }
};

const handleAvailabilityStatus = async (io, socket, data) => {
  try {
    const userId = socket.user.id;
    const { status } = data;
    const updatedStatus = await adminProfileService.updateAvailabilityStatus(userId, status, socket.user);
    io.to(`admin:${userId}`).emit(adminProfileEvents.STATUS_CHANGED, { availability_status: updatedStatus });
    logger.info('Admin availability status updated via socket', { userId, status });
  } catch (error) {
    logger.error('Failed to update admin availability status via socket', { error: error.message, userId: socket.user.id });
    socket.emit(adminProfileEvents.ERROR, {
      message: error.message,
      code: error.code || adminConstants.ERROR_CODES.STATUS_UPDATE_FAILED,
    });
  }
};

const setupProfileHandlers = (io, socket) => {
  socket.on(adminProfileEvents.UPDATE_PROFILE, (data) => handleProfileUpdate(io, socket, data));
  socket.on(adminProfileEvents.UPDATE_STATUS, (data) => handleAvailabilityStatus(io, socket, data));
};

module.exports = { setupProfileHandlers };