'use strict';

const socketService = require('@services/common/socketService');
const mTablesConstants = require('@constants/common/mTablesConstants');
const logger = require('@utils/logger');

const setupSupportEvents = (io, socket) => {
  socket.on('merchant:mtables:supportTicketCreated', (data) => {
    logger.info('Support ticket created event received', { data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED, data);
  });

  socket.on('merchant:mtables:supportTicketResolved', (data) => {
    logger.info('Support ticket resolved event received', { data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_RESOLVED, data);
  });

  socket.on('merchant:mtables:supportPoliciesCommunicated', (data) => {
    logger.info('Support policies communicated event received', { data });
    socketService.emit(socket.id, mTablesConstants.NOTIFICATION_TYPES.POLICY_COMMUNICATION, data);
  });
});

module.exports = { setupSupportEvents };