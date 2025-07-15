'use strict';

const analyticsEvents = require('@socket/events/admin/mtables/analyticsEvents');
const logger = require('@utils/logger');

function setupAnalyticsHandlers(io, socket) {
  socket.on(analyticsEvents.BOOKING_ANALYTICS, (data) => {
    logger.info('Booking analytics event received', { data });
    socket.emit(analyticsEvents.BOOKING_ANALYTICS, data);
  });

  socket.on(analyticsEvents.REPORT_GENERATED, (data) => {
    logger.info('Report generated event received', { data });
    socket.emit(analyticsEvents.REPORT_GENERATED, data);
  });

  socket.on(analyticsEvents.ENGAGEMENT_COMPLETED, (data) => {
    logger.info('Engagement completed event received', { data });
    socket.emit(analyticsEvents.ENGAGEMENT_COMPLETED, data);
  });

  socket.on(analyticsEvents.GAMIFICATION_TRACKED, (data) => {
    logger.info('Gamification tracked event received', { data });
    socket.emit(analyticsEvents.GAMIFICATION_TRACKED, data);
  });
}

module.exports = {
  setupAnalyticsHandlers,
};