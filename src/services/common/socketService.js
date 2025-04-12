'use strict';

const { handleLogin, handleLogout } = require('@socket/handlers');
const logger = require('@utils/logger');

const emitLoginNotification = (io, user, isGoogle = false) => {
  try {
    handleLogin(io, user, isGoogle);
  } catch (error) {
    logger.logErrorEvent('Socket notification failed', {
      error: error.message,
      userId: user.id,
    });
    console.error('Socket error:', error);
  }
};

const emitLogoutNotification = (io, user, deviceId, clearAllDevices) => {
  try {
    handleLogout(io, user, deviceId, clearAllDevices);
  } catch (error) {
    logger.logErrorEvent('Socket notification failed', {
      error: error.message,
      userId: user.id,
    });
    console.error('Socket error:', error);
  }
};

module.exports = {
  emitLoginNotification,
  emitLogoutNotification,
};