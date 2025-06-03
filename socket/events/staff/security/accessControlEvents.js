'use strict';

/**
 * accessControlEvents.js
 * Socket events for munch access control (staff role).
 * Events: security:access_granted, security:access_audited, security:rules_updated, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupAccessControlEvents(io, socket) {
  socket.on('munch:security:access_granted', (data) => {
    try {
      socketService.emit(io, 'security:access_granted', {
        staffId: data.staffId,
        permission: data.permission,
      }, `munch:security:${data.staffId}`);
      logger.info('Access granted event emitted', data);
    } catch (error) {
      logger.error('Access granted event failed', { error: error.message, data });
    }
  });

  socket.on('munch:security:access_audited', (data) => {
    try {
      socketService.emit(io, 'security:access_audited', {
        staffId: data.staffId,
        logId: data.logId,
      }, `munch:security:${data.staffId}`);
      logger.info('Access audited event emitted', data);
    } catch (error) {
      logger.error('Access audited event failed', { error: error.message, data });
    }
  });

  socket.on('munch:security:rules_updated', (data) => {
    try {
      socketService.emit(io, 'security:rules_updated', {
        staffId: data.staffId,
        permissions: data.permissions,
      }, `munch:security:${data.staffId}`);
      logger.info('Access rules updated event emitted', data);
    } catch (error) {
      logger.error('Access rules updated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Access points awarded event emitted', data);
    } catch (error) {
      logger.error('Access points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch access control', { socketId: socket.id });
    setupAccessControlEvents(io, socket);
  });
}

module.exports = { initialize };