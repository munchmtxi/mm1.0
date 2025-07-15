'use strict';

const socketService = require('@services/common/socketService');
const taskManagementEvents = require('@socket/events/staff/staffManagement/taskManagement.events');
const logger = require('@utils/logger');

function setupTaskManagementHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(taskManagementEvents.TASK_ASSIGNED, (data) => {
      logger.info('Task assigned event received', { data });
      socketService.emit(`munch:task:${data.staffId}`, taskManagementEvents.TASK_ASSIGNED, data);
    });

    socket.on(taskManagementEvents.TASK_PROGRESS_UPDATED, (data) => {
      logger.info('Task progress updated event received', { data });
      socketService.emit(`munch:task:${data.staffId}`, taskManagementEvents.TASK_PROGRESS_UPDATED, data);
    });

    socket.on(taskManagementEvents.TASK_DELAYED, (data) => {
      logger.info('Task delayed event received', { data });
      socketService.emit(`munch:task:${data.staffId}`, taskManagementEvents.TASK_DELAYED, data);
    });

    socket.on(taskManagementEvents.POINTS_AWARDED, (data) => {
      logger.info('Points awarded event received', { data });
      socketService.emit(`munch:staff:${data.staffId}`, taskManagementEvents.POINTS_AWARDED, data);
    });
  });
}

module.exports = { setupTaskManagementHandlers };