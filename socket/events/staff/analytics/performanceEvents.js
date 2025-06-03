'use strict';

/**
 * performanceEvents.js
 * Socket events for munch performance analytics (staff role).
 * Keywords: performance, metrics_updated, report_generated, training_evaluated, points, staff.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupPerformanceEvents(io, socket) {
  socket.on('munch:performance:metrics_updated', (data) => {
    try {
      socketService.emit(io, 'performance:metrics_updated', {
        staffId: data.staffId,
        metrics: data.metrics,
      }, `munch:performance:${data.staffId}`);
      logger.info('Performance metrics updated event emitted', data);
    } catch (error) {
      logger.error('Performance metrics updated event failed', error.message, data);
    }
  });

  socket.on('munch:performance:report_generated', (data) => {
    try {
      socketService.emit(io, 'performance:report_generated', {
        staffId: data.staffId,
        reportId: data.reportId,
      }, `munch:performance:${data.staffId}`);
      logger.info('Performance report generated event emitted', data);
    } catch (error) {
      logger.error('Performance report generated event failed', error.message, data);
    }
  });

  socket.on('munch:performance:training_evaluated', (data) => {
    try {
      socketService.emit(io, 'performance:training_evaluated', {
        staffId: data.staffId,
        trainingsCompleted: data.trainingsCompleted,
      }, `munch:performance:${data.staffId}`);
      logger.info('Training evaluated event emitted', data);
    } catch (error) {
      logger.error('Training evaluated event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Performance points awarded event emitted', data);
    } catch (error) {
      logger.error('Performance points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch performance', socket.id);
    setupPerformanceEvents(io, socket);
  });
}

module.exports = { initialize };