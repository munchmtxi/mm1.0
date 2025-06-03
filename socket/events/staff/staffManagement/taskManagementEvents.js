'use strict';

/**
 * taskManagementEvents.js
 * Socket events for munch task management (staff role).
 * Events: task:assigned, task:progress_updated, task:delayed, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logging');

function setupTaskEvents(io, socket) {
  socket.on('munch:task:assigned', (data) => {
    try {
      socketService.emit(io, 'task:assigned', {
        staffId: data.staffId,
        taskId: data.taskId,
      }, `munch:task:${data.staffId}`);
      logger.info('Task assigned event emitted', data);
    } catch (error) {
      logger.error('Task assigned event failed', { error: error.message, data });
    }
  });

  socket.on('munch:task:progress_updated', (data) => {
    try {
      socketService.emit(io, 'task:progress_updated', {
        taskId: data.taskId,
        status: data.status,
        dueDate: data.dueDate,
      }, `munch:task:${data.staffId}`);
      logger.info('Task progress updated event emitted', data);
    } catch (error) {
      logger.error('Task progress updated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:task:delayed', (data) => {
    try {
      socketService.emit(io, 'task:delayed', {
        task_id: data.taskId,
      }, `munch:task:${data.staff_id}`);
      logger.info('Task delayed event emitted', data);
    } catch (error) {
      logger.error('Task delayed event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_completed', (data) => {
    try {
      socketService.emit(io, 'staff:points:awarded', {
        staff_id: data.staffId,
        action: data.action,
        points: data.points,
      }, `munch:staff:${data.staffId}`);
      logger.info('Task points awarded event emitted', data);
    } catch (error) {
      logger.error('Task points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch task management', { socketId: socket.id });
    setupTaskEvents(io, socket);
  });
}

module.exports = { initialize };