'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleVerificationSubmitted = async (io, user, verificationMethod) => {
  try {
    const room = `role:${user.role}`;
    await socketService.emit(io, authEvents.VERIFICATION_SUBMITTED, {
      userId: user.id,
      role: user.role,
      verificationMethod,
      timestamp: new Date().toISOString(),
      message: 'Verification submitted',
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT,
      details: { verificationMethod },
      ipAddress: '0.0.0.0', // Placeholder
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle verification submitted event', { error: error.message });
    throw new AppError('Failed to send verification submitted notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

const handleVerificationApproved = async (io, user, verificationMethod) => {
  try {
    const room = `role:${user.role}`;
    await socketService.emit(io, authEvents.VERIFICATION_APPROVED, {
      userId: user.id,
      role: user.role,
      verificationMethod,
      timestamp: new Date().toISOString(),
      message: authConstants.SUCCESS_MESSAGES[4], // USER_VERIFIED
    }, room);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT,
      details: { verificationMethod, success: true },
      ipAddress: '0.0.0.0', // Placeholder
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle verification approved event', { error: error.message });
    throw new AppError('Failed to send verification approved notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleVerificationSubmitted, handleVerificationApproved };