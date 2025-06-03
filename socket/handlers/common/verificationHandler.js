'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('@socket/events/common/authEvents');
const authConstants = require('@constants/common/authConstants');

const handleVerificationSubmitted = (io, user, verificationMethod) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.VERIFICATION_SUBMITTED, {
      userId: user.id,
      role: user.role,
      verificationMethod,
      timestamp: new Date(),
      message: 'Verification submitted',
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT, {
      userId: user.id,
      role: user.role,
      verificationMethod,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle verification submitted event', { error: error.message });
    throw new AppError('Failed to send verification submitted notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

const handleVerificationApproved = (io, user, verificationMethod) => {
  try {
    const room = `role:${user.role}`;
    io.to(room).emit(authEvents.VERIFICATION_APPROVED, {
      userId: user.id,
      role: user.role,
      verificationMethod,
      timestamp: new Date(),
      message: 'Verification approved',
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.VERIFICATION_ATTEMPT, {
      userId: user.id,
      role: user.role,
      verificationMethod,
      success: true,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle verification approved event', { error: error.message });
    throw new AppError('Failed to send verification approved notification', 500, authConstants.ERROR_CODES.SOCKET_ERROR);
  }
};

module.exports = { handleVerificationSubmitted, handleVerificationApproved };