'use strict';

/**
 * gamificationEvents.js
 * Socket events for munch gamification operations (staff role).
 * Keywords: gamification, points_logged, customer_points_synced, report_generated, points, staff, customer.
 * Last Updated: May 25, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupGamificationEvents(io, socket) {
  socket.on('munch:gamification:points_logged', (data) => {
    try {
      socketService.emit(io, 'gamification:points_logged', {
        staffId: data.staffId,
        action: data.action,
        points: data.points,
      }, `munch:gamification:${data.staffId}`);
      logger.info('Staff points logged event emitted', data);
    } catch (error) {
      logger.error('Staff points logged event failed', error.message, data);
    }
  });

  socket.on('munch:gamification:customer_points_synced', (data) => {
    try {
      socketService.emit(io, 'gamification:customer_points_synced', {
        customerId: data.customerId,
        points: data.points,
      }, `munch:gamification:${data.customerId}`);
      logger.info('Customer points synced event emitted', data);
    } catch (error) {
      logger.error('Customer points synced event failed', error.message, data);
    }
  });

  socket.on('munch:gamification:report_generated', (data) => {
    try {
      socketService.emit(io, 'gamification:report_generated', {
        staffId: data.staffId,
        reportId: data.reportId,
      }, `munch:gamification:${data.staffId}`);
      logger.info('Gamification report generated event emitted', data);
    } catch (error) {
      logger.error('Gamification report generated event failed', error.message, data);
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Gamification points awarded event emitted', data);
    } catch (error) {
      logger.error('Gamification points awarded event failed', error.message, data);
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch gamification', socket.id);
    setupGamificationEvents(io, socket);
  });
}

module.exports = { initialize };