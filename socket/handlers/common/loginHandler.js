'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleLogin = (io, user, isGoogle = false) => {
  try {
    const room = `role:${user.role}`;
    const event = isGoogle ? authEvents.GOOGLE_LOGIN : authEvents.LOGIN;
    io.to(room).emit(event, {
      userId: user.id,
      role: user.role,
      timestamp: new Date(),
      message: isGoogle
        ? `${authConstants.SUCCESS_MESSAGES.LOGIN_SUCCESS} via Google`
        : authConstants.SUCCESS_MESSAGES.LOGIN_SUCCESS,
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN, {
      userId: user.id,
      role: user.role,
      type: 'security',
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle login', { error: error.message });
    throw new AppError('Failed to send login notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleLogin };