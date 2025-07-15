'use strict';

const analyticsEvents = require('@socket/events/merchant/mtables/analyticsEvents');
const logger = require('@utils/logger');

function setupAnalyticsHandlers(io, socket) {
  socket.on(analyticsEvents.SALES_TRACKED, (data) => {
    logger.info('Sales tracked event received', { restaurantId: data.restaurantId });
    socket.to(`merchant:${data.restaurantId}`).emit(analyticsEvents.SALES_TRACKED, data);
  });

  socket.on(analyticsEvents.BOOKING_TRENDS_ANALYZED, (data) => {
    logger.info('Booking trends analyzed event received', { restaurantId: data.restaurantId });
    socket.to(`merchant:${data.restaurantId}`).emit(analyticsEvents.BOOKING_TRENDS_ANALYZED, data);
  });

  socket.on(analyticsEvents.REPORT_GENERATED, (data) => {
    logger.info('Report generated event received', { restaurantId: data.restaurantId });
    socket.to(`merchant:${data.restaurantId}`).emit(analyticsEvents.REPORT_GENERATED, data);
  });

  socket.on(analyticsEvents.ENGAGEMENT_ANALYZED, (data) => {
    logger.info('Engagement analyzed event received', { restaurantId: data.restaurantId });
    socket.to(`merchant:${data.restaurantId}`).emit(analyticsEvents.ENGAGEMENT_ANALYZED, data);
  });
}

module.exports = { setupAnalyticsHandlers };