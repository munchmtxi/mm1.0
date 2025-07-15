'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleMfaEnabled = async (io, user, mfaMethod) => {
  try {
    const room = `role:${user.role}`;
    await socketService.emit(io, authEvents.MFA_ENABLED, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      timestamp: new Date().toISOString(),
      message: authConstants.SUCCESS_MESSAGES[2], // MFA_ENABLED
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
      details: { mfaMethod, success: true },
      ipAddress: '0.0.0.0', // Placeholder
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle MFA enabled event', { error: error.message });
    throw new AppError('Failed to send MFA enabled notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

const handleMfaVerified = async (io, user, mfaMethod) => {
  try {
    const room = `role:${user.role}`;
    await socketService.emit(io, authEvents.MFA_VERIFIED, {
      userId: user.id,
      role: user.role,
      mfaMethod,
      timestamp: new Date().toISOString(),
      message: 'MFA verification successful',
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
      details: { mfaMethod, success: true },
      ipAddress: '0.0.0.0', // Placeholder
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle MFA verified event', { error: error.message });
    throw new AppError('Failed to send MFA verified notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleMfaEnabled, handleMfaVerified };