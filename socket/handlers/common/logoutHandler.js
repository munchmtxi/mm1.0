'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleLogout = async (io, user, deviceId, clearAllDevices) => {
  try {
    const room = `role:${user.role}`;
    await socketService.emit(io, authEvents.LOGOUT, {
      userId: user.id,
      role: user.role,
      deviceId,
      clearAllDevices,
      timestamp: new Date().toISOString(),
      message: authConstants.SUCCESS_MESSAGES[5], // SESSION_TERMINATED
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGOUT,
      details: { deviceId, clearAllDevices },
      ipAddress: '0.0.0.0', // Placeholder; update with actual IP
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle logout event', { error: error.message });
    throw new AppError('Failed to send logout notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleLogout };