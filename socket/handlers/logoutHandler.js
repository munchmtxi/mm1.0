'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('../events/authEvents');

const handleLogout = (io, user, deviceId, clearAllDevices) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.LOGOUT, {
      userId: user.id,
      role: user.role,
      deviceId,
      clearAllDevices,
      timestamp: new Date(),
      message: `User ${user.id} (${user.role}) logged out`,
    });
    logger.logSecurityEvent('Logout notification emitted', { userId: user.id, role: user.role });
  } catch (error) {
    logger.logErrorEvent('Failed to handle logout event', { error: error.message });
    throw new AppError('Failed to send logout notification', 500, 'SOCKET_ERROR');
  }
};

module.exports = { handleLogout };