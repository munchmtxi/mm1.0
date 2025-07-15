'use strict';

const analyticsEvents = require('@socket/events/merchant/analytics/analyticsEvents');
const logger = require('@utils/logger');

function setupAnalyticsHandlers(io, socket) {
  socket.on(analyticsEvents.BEHAVIOR_TRACKED, (data) => {
    logger.info('Behavior tracked event received', { customerId: data.customerId });
    socket.to(`merchant:${data.customerId}`).emit(analyticsEvents.BEHAVIOR_TRACKED, data);
  });

  socket.on(analyticsEvents.SPENDING_TRENDS_ANALYZED, (data) => {
    logger.info('Spending trends analyzed event received', { customerId: data.customerId });
    socket.to(`merchant:${data.customerId}`).emit(analyticsEvents.SPENDING_TRENDS_ANALYZED, data);
  });

  socket.on(analyticsEvents.RECOMMENDATIONS_PROVIDED, (data) => {
    logger.info('Recommendations provided event received', { customerId: data.customerId });
    socket.to(`merchant:${data.customerId}`).emit(analyticsEvents.RECOMMENDATIONS_PROVIDED, data);
  });

  socket.on(analyticsEvents.DRIVER_METRICS_MONITORED, (data) => {
    logger.info('Driver metrics monitored event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(analyticsEvents.DRIVER_METRICS_MONITORED, data);
  });

  socket.on(analyticsEvents.DRIVER_REPORT_GENERATED, (data) => {
    logger.info('Driver report generated event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(analyticsEvents.DRIVER_REPORT_GENERATED, data);
  });

  socket.on(analyticsEvents.DRIVER_FEEDBACK_PROVIDED, (data) => {
    logger.info('Driver feedback provided event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(analyticsEvents.DRIVER_FEEDBACK_PROVIDED, data);
  });

  socket.on(analyticsEvents.BRANCH_DATA_AGGREGATED, (data) => {
    logger.info('Branch data aggregated event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(analyticsEvents.BRANCH_DATA_AGGREGATED, data);
  });

  socket.on(analyticsEvents.BRANCH_PERFORMANCE_COMPARED, (data) => {
    logger.info('Branch performance compared event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(analyticsEvents.BRANCH_PERFORMANCE_COMPARED, data);
  });

  socket.on(analyticsEvents.MULTI_BRANCH_REPORTS_GENERATED, (data) => {
    logger.info('Multi-branch reports generated event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(analyticsEvents.MULTI_BRANCH_REPORTS_GENERATED, data);
  });

  socket.on(analyticsEvents.RESOURCES_ALLOCATED, (data) => {
    logger.info('Resources allocated event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(analyticsEvents.RESOURCES_ALLOCATED, data);
  });

  socket.on(analyticsEvents.STAFF_METRICS_MONITORED, (data) => {
    logger.info('Staff metrics monitored event received', { staffId: data.staffId });
    socket.to(`staff:${data.staffId}`).emit(analyticsEvents.STAFF_METRICS_MONITORED, data);
  });

  socket.on(analyticsEvents.STAFF_REPORT_GENERATED, (data) => {
    logger.info('Staff report generated event received', { staffId: data.staffId });
    socket.to(`staff:${data.staffId}`).emit(analyticsEvents.STAFF_REPORT_GENERATED, data);
  });

  socket.on(analyticsEvents.STAFF_FEEDBACK_PROVIDED, (data) => {
    logger.info('Staff feedback provided event received', { staffId: data.staffId });
    socket.to(`staff:${data.staffId}`).emit(analyticsEvents.STAFF_FEEDBACK_PROVIDED, data);
  });
}

module.exports = { setupAnalyticsHandlers };