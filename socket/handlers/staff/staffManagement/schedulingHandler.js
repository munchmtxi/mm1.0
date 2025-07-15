'use strict';

const socketService = require('@services/common/socketService');
const schedulingEvents = require('@socket/events/staff/staffManagement/scheduling.events');
const logger = require('@utils/logger');

function setupSchedulingHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(schedulingEvents.SHIFT_CREATED, (data) => {
      logger.info('Shift created event received', { data });
      socketService.emit(`munch:scheduling:${data.staffId}`, schedulingEvents.SHIFT_CREATED, data);
    });

    socket.on(schedulingEvents.SHIFT_UPDATED, (data) => {
      logger.info('Shift updated event received', { data });
      socketService.emit(`munch:scheduling:${data.staffId}`, schedulingEvents.SHIFT_UPDATED, data);
    });

    socket.on(schedulingEvents.SHIFT_NOTIFIED, (data) => {
      logger.info('Shift notified event received', { data });
      socketService.emit(`munch:scheduling:${data.staffId}`, schedulingEvents.SHIFT_NOTIFIED, data);
    });

    socket.on(schedulingEvents.POINTS_AWARDED, (data) => {
      logger.info('Points awarded event received', { data });
      socketService.emit(`munch:staff:${data.staffId}`, schedulingEvents.POINTS_AWARDED, data);
    });
  });
}

module.exports = { setupSchedulingHandlers };