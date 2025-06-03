'use strict';

/**
 * roleManagementEvents.js
 * Socket events for munch role management (staff role).
 * Events: role:assigned, role:permissions_updated, role:details_retrieved, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupRoleEvents(io, socket) {
  socket.on('munch:role:assigned', (data) => {
    try {
      socketService.emit(io, 'role:assigned', {
        staffId: data.staffId,
        role: data.role,
      }, `munch:role:${data.staffId}`);
      logger.info('Role assigned event emitted', data);
    } catch (error) {
      logger.error('Role assigned event failed', { error: error.message, data });
    }
  });

  socket.on('munch:role:permissions_updated', (data) => {
    try {
      socketService.emit(io, 'role:permissions_updated', {
        staffId: data.staffId,
        permissions: data.permissions,
      }, `munch:role:${data.staffId}`);
      logger.info('Permissions updated event emitted', data);
    } catch (error) {
      logger.error('Permissions updated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:role:details_retrieved', (data) => {
    try {
      socketService.emit(io, 'role:details_retrieved', {
        staffId: data.staffId,
        position: data.position,
        details: data.details,
      }, `munch:role:${data.staffId}`);
      logger.info('Role details retrieved event emitted', data);
    } catch (error) {
      logger.error('Role details retrieved event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'staff:points:awarded', {
        staffId: data.staff_id,
        action: data.action,
        points: data.points,
      }, `munch:staffId:${data.staffId}`);
      logger.info('Role points awarded event emitted', data);
    } catch (error) {
      logger.error('Role points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch role management', { socketId: socket.id });
    setupRoleEvents(io, socket);
  });
}

module.exports = { initialize };