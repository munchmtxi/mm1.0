'use strict';

const supportEvents = require('@socket/events/driver/support/supportEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function initializeSupportHandlers(socket) {
  socket.on(supportEvents.TICKET_CREATED, (data) => {
    logger.info('Ticket created event received', { data });
    socketService.emitToUser(data.driverId, supportEvents.TICKET_CREATED, data);
  });

  socket.on(supportEvents.TICKET_STATUS, (data) => {
    logger.info('Ticket status event received', { data });
    socketService.emitToUser(data.driverId, supportEvents.TICKET_STATUS, data);
  });

  socket.on(supportEvents.CANCELLATION_POLICIES, (data) => {
    logger.info('Cancellation policies event received', { data });
    socketService.emitToUser(data.driverId, supportEvents.CANCELLATION_POLICIES, data);
  });

  socket.on(supportEvents.TICKET_ESCALATED, (data) => {
    logger.info('Ticket escalated event received', { data });
    socketService.emitToUser(data.driverId, supportEvents.TICKET_ESCALATED, data);
  });
}

module.exports = {
  initializeSupportHandlers,
};