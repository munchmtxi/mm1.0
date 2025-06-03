'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleMfaEnabled = (io, user, mfaMethod) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.MFA_ENABLED, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      timestamp: new Date(),
      message: authConstants.SUCCESS_MESSAGES.MFA_ENABLED,
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      success: true,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle MFA enabled event', { error: error.message });
    throw new AppError('Failed to send MFA enabled notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

const handleMfaVerified = (io, user, mfaMethod) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.MFA_VERIFIED, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      timestamp: new Date(),
      message: 'MFA verification successful',
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      success: true,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle MFA verified event', { error: error.message });
    throw new AppError('Failed to send MFA verified notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleMfaEnabled, handleMfaVerified };