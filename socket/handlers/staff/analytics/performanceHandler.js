// performanceHandler.js
// Handles socket event emissions for staff performance analytics operations.

'use strict';

const socketService = require('@services/common/socketService');
const performanceEvents = require('@socket/events/staff/analytics/performanceEvents');

function setupPerformanceHandlers(io) {
  return {
    emitMetricsUpdated: (data, room) => {
      socketService.emit(io, performanceEvents.METRICS_UPDATED, data, room);
    },
    emitReportGenerated: (data, room) => {
      socketService.emit(io, performanceEvents.REPORT_GENERATED, data, room);
    },
    emitTrainingEvaluated: (data, room) => {
      socketService.emit(io, performanceEvents.TRAINING_EVALUATED, data, room);
    },
  };
}

module.exports = { setupPerformanceHandlers };