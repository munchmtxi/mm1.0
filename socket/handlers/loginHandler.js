'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authEvents = require('../events/authEvents');

/**
 * Emits login or Google login event.
 * @param {Server} io - Socket.io server instance.
 * @param {Object} user - User data { id, role }.
 * @param {boolean} isGoogle - Whether login is via Google OAuth.
 */
const handleLogin = (io, user, isGoogle = false) => {
  try {
    const room = `role:${user.role}`;
    const event = isGoogle ? authEvents.GOOGLE_LOGIN : authEvents.LOGIN;
    console.log('loginHandler: Emitting to room:', room, 'for user:', user.id);
    io.to(room).emit(event, {
      userId: user.id,
      role: user.role,
      timestamp: new Date(),
      message: `User ${user.id} (${user.role}) logged in${isGoogle ? ' via Google' : ''}`,
    });
    logger.logSecurityEvent('Login notification', {
      userId: user.id,
      role: user.role,
      type: 'security',
    });
  } catch (error) {
    logger.logErrorEvent('Failed to handle login', { error: error.message });
    throw new AppError('Failed to send login notification', 500, 'SOCKET_ERROR');
  }
};

module.exports = { handleLogin };