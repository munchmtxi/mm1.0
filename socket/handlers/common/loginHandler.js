'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleLogin = async (io, user, isGoogle = false) => {
  try {
    const room = `role:${user.role}`;
    const event = isGoogle ? authEvents.GOOGLE_LOGIN : authEvents.LOGIN;
    await socketService.emit(io, event, {
      userId: user.id,
      role: user.role,
      timestamp: new Date().toISOString(),
      message: isGoogle
        ? `${authConstants.SUCCESS_MESSAGES[0]} via Google` // USER_LOGGED_IN
        : authConstants.SUCCESS_MESSAGES[0],
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN,
      details: { type: isGoogle ? 'google_oauth' : 'standard', event },
      ipAddress: '0.0.0.0', // Placeholder; update with actual IP from context
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle login', { error: error.message });
    throw new AppError('Failed to send login notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleLogin };