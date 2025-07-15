'use strict';

const settingsEvents = require('@socket/events/driver/profile/settingsEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeSettingsHandlers(socket) {
  socket.on(settingsEvents.COUNTRY_UPDATED, (data) => {
    logger.info('Country updated event received', { data });
    socketService.emitToUser(data.driverId, settingsEvents.COUNTRY_UPDATED, data);
  });

  socket.on(settingsEvents.LANGUAGE_UPDATED, (data) => {
    logger.info('Language updated event received', { data });
    socketService.emitToUser(data.driverId, settingsEvents.LANGUAGE_UPDATED, data);
  });

  socket.on(settingsEvents.ACCESSIBILITY_UPDATED, (data) => {
    logger.info('Accessibility updated event received', { data });
    socketService.emitToUser(data.driverId, settingsEvents.ACCESSIBILITY_UPDATED, data);
  });

  socket.on(settingsEvents.PRIVACY_UPDATED, (data) => {
    logger.info('Privacy updated event received', { data });
    socketService.emitToUser(data.driverId, settingsEvents.PRIVACY_UPDATED, data);
  });
}

module.exports = {
  initializeSettingsHandlers,
};