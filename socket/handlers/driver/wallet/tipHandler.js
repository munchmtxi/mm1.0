'use strict';

const tipEvents = require('@socket/events/driver/wallet/tipEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeTipHandlers(socket) {
  socket.on(tipEvents.TIP_RECEIVED, (data) => {
    logger.info('Tip received event received', { data });
    socketService.emitToUser(data.driverId, tipEvents.TIP_RECEIVED, data);
  });

  socket.on(tipEvents.TIP_HISTORY_VIEWED, (data) => {
    logger.info('Tip history viewed event received', { data });
    socketService.emitToUser(data.driverId, tipEvents.TIP_HISTORY_VIEWED, data);
  });

  socket.on(tipEvents.TIP_NOTIFIED, (data) => {
    logger.info('Tip notified event received', { data });
    socketService.emitToUser(data.driverId, tipEvents.TIP_NOTIFIED, data);
  });

  socket.on(tipEvents.TIP_POINTS_AWARDED, (data) => {
    logger.info('Tip points awarded event received', { data });
    socketService.emitToUser(data.driverId, tipEvents.TIP_POINTS_AWARDED, data);
  });
}

module.exports = {
  initializeTipHandlers,
};