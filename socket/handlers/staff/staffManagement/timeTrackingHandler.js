'use strict';

const socketService = require('@services/common/socketService');
const timeTrackingEvents = require('@socket/events/staff/staffManagement/timeTracking.events');
const logger = require('@utils/logger');

function setupTimeTrackingHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(timeTrackingEvents.CLOCK_IN, (data) => {
      logger.info('Clock-in event received', { data });
      socketService.emit(`munch:timetracking:${data.staffId}`, timeTrackingEvents.CLOCK_IN, data);
    });

    socket.on(timeTrackingEvents.CLOCK_OUT, (data) => {
      logger.info('Clock-out event received', { data });
      socketService.emit(`munch:timetracking:${data.staffId}`, timeTrackingEvents.CLOCK_OUT, data);
    });

    socket.on(timeTrackingEvents.DURATION_CALCULATED, (data) => {
      logger.info('Duration calculated event received', { data });
      socketService.emit(`munch:timetracking:${data.staffId}`, timeTrackingEvents.DURATION_CALCULATED, data);
    });

    socket.on(timeTrackingEvents.REPORT_GENERATED, (data) => {
      logger.info('Report generated event received', { data });
      socketService.emit(`munch:timetracking:${data.staffId}`, timeTrackingEvents.REPORT_GENERATED, data);
    });

    socket.on(timeTrackingEvents.POINTS_AWARDED, (data) => {
      logger.info('Points awarded event received', { data });
      socketService.emit(`munch:staff:${data.staffId}`, timeTrackingEvents.POINTS_AWARDED, data);
    });
  });
}

module.exports = { setupTimeTrackingHandlers };