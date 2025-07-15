'use strict';

const analyticsEvents = require('@socket/events/admin/mtxi/analyticsEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils');

function handleAnalyticsEvents(io, socket) {
  socket.on(analyticsEvents.REPORT_GENERATED, async (data) => {
    try {
      await socketService.emit(data.userId, analyticsEvents.REPORT_GENERATED, data);
      logger.info('Report generated event handled', { userId: data.userId, driverId: data.driverId });
    } catch (error) {
      logger.logErrorEvent(`handleReportGenerated failed: ${error.message}`, { userId: data.userId });
    }
  });

  socket.on(analyticsEvents.PERFORMANCE_UPDATED, async (data) => {
    try {
      await socketService.emit(data.userId, analyticsEvents.PERFORMANCE_UPDATED, data);
      logger.info('Performance updated event handled', { userId: data.userId, driverId: data.driverId });
    } catch (error) {
      logger.logErrorEvent(`handlePerformanceUpdated failed: ${error.message}`, { userId: data.userId });
    }
  });
}

module.exports = { handleAnalyticsEvents };