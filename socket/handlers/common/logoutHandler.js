'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleLogout = (io, user, deviceId, clearAllDevices) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.LOGOUT, {
      userId: user.id,
      role: user.role,
      deviceId,
      clearAllDevices,
      timestamp: new Date(),
      message: authConstants.SUCCESS_MESSAGES.SESSION_TERMINATED,
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGOUT, {
      userId: user.id,
      role: user.role,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle logout event', { error: error.message });
    throw new AppError('Failed to send logout notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleLogout };