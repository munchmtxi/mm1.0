'use strict';

/**
 * timeTrackingEvents.js
 * Socket events for munch time tracking (staff role).
 * Events: timetracking:clock_in, timetracking:clock_out, timetracking:duration_calculated, timetracking:report_generated, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupTimeTrackingEvents(io, socket) {
  socket.on('munch:timetracking:clock_in', (data) => {
    try {
      socketService.emit(io, 'timetracking:clock_in', {
        staffId: data.staffId,
        timestamp: data.timestamp,
      }, `munch:timetracking:${data.staffId}`);
      logger.info('Clock-in event emitted', data);
    } catch (error) {
      logger.error('Clock-in event failed', { error: error.message, data });
    }
  });

  socket.on('munch:timetracking:clock_out', (data) => {
    try {
      socketService.emit(io, 'timetracking:clock_out', {
        staffId: data.staffId,
        timestamp: data.timestamp,
      }, `munch:timetracking:${data.staffId}`);
      logger.info('Clock-out event emitted', data);
    } catch (error) {
      logger.error('Clock-out event failed', { error: error.message, data });
    }
  });

  socket.on('munch:timetracking:duration_calculated', (data) => {
    try {
      socketService.emit(io, 'timetracking:duration_calculated', {
        staffId: data.staffId,
        totalHours: data.totalHours,
      }, `munch:timetracking:${data.staffId}`);
      logger.info('Duration calculated event emitted', data);
    } catch (error) {
      logger.error('Duration calculated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:timetracking:report_generated', (data) => {
    try {
      socketService.emit(io, 'timetracking:report_generated', {
        staffId: data.staffId,
        reportId: data.reportId,
      }, `munch:timetracking:${data.staffId}`);
      logger.info('Time report generated event emitted', data);
    } catch (error) {
      logger.error('Time report generated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Time tracking points awarded event emitted', data);
    } catch (error) {
      logger.error('Time tracking points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch time tracking', socket.id);
    setupTimeTrackingEvents(io, socket);
  });
}

module.exports = { initialize };