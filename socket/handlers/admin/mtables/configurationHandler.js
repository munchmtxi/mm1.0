'use strict';

const configurationEvents = require('@socket/events/admin/mtables/configurationEvents');
const logger = require('@utils/logger');

function setupConfigurationHandlers(io, socket) {
  socket.on(configurationEvents.TABLE_RULES_UPDATED, (data) => {
    logger.info('Table rules updated event received', { data });
    socket.emit(configurationEvents.TABLE_RULES_UPDATED, data);
  });

  socket.on(configurationEvents.GAMIFICATION_UPDATED, (data) => {
    logger.info('Gamification rules updated event received', { data });
    socket.emit(configurationEvents.GAMIFICATION_UPDATED, data);
  });

  socket.on(configurationEvents.WAITLIST_UPDATED, (data) => {
    logger.info('Waitlist settings updated event received', { data });
    socket.emit(configurationEvents.WAITLIST_UPDATED, data);
  });

  socket.on(configurationEvents.PRICING_UPDATED, (data) => {
    logger.info('Pricing models updated event received', { data });
    socket.emit(configurationEvents.PRICING_UPDATED, data);
  });
}

module.exports = {
  setupConfigurationHandlers,
};