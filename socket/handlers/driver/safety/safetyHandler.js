'use strict';

const safetyEvents = require('@socket/events/driver/safety/safetyEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeSafetyHandlers(socket) {
  socket.on(safetyEvents.INCIDENT_REPORTED, (data) => {
    logger.info('Incident reported event received', { data });
    socketService.emitToUser(data.driverId, safetyEvents.INCIDENT_REPORTED, data);
  });

  socket.on(safetyEvents.SOS_TRIGGERED, (data) => {
    logger.info('SOS triggered event received', { data });
    socketService.emitToUser(data.driverId, safetyEvents.SOS_TRIGGERED, data);
  });

  socket.on(safetyEvents.STATUS_UPDATED, (data) => {
    logger.info('Safety status updated event received', { data });
    socketService.emitToUser(data.driverId, safetyEvents.STATUS_UPDATED, data);
  });

  socket.on(safetyEvents.DISCREET_ALERT_SENT, (data) => {
    logger.info('Discreet alert sent event received', { data });
    socketService.emitToUser(data.driverId, safetyEvents.DISCREET_ALERT_SENT, data);
  });
}

module.exports = {
  initializeSafetyHandlers,
};