'use strict';

const socketService = require('@services/common/socketService');
const gamificationConstants = require('@constants/common/gamificationConstants');
const logger = require('@utils/logger');

const setupDataProtectionEvents = (io, socket) => {
  socket.on('merchant:security:dataEncrypted', (data) => {
    logger.info('Data encrypted event received', { data });
    socketService.emit(socket.id, 'dataEncrypted', data);
  });

  socket.on('merchant:security:complianceUpdated', (data) => {
    logger.info('Compliance updated event received', { data });
    socketService.emit(socket.id, 'gdprEnforced', data);
  });

  socket.on('merchant:security:accessRestricted', (data) => {
    logger.info('Access restricted event received', { data });
    socketService.emit(socket.id, 'dataAccessManaged', data);
  });

  socket.on('merchant:security:auditCompleted', (data) => {
    logger.info('Audit completed event received', { data });
    socketService.emit(socket.id, 'complianceAudited', data);
  });
};

module.exports = { setupDataProtectionEvents };