'use strict';

/**
 * trainingEvents.js
 * Socket events for munch training (staff role).
 * Events: training:assigned, training:progress_updated, training:compliance_assessed, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupTrainingEvents(io, socket) {
  socket.on('munch:training:assigned', (data) => {
    try {
      socketService.emit(io, 'training:assigned', {
        staffId: data.staffId,
        trainingId: data.trainingId,
      }, `munch:training:${data.staffId}`);
      logger.info('Training assigned event emitted', data);
    } catch (error) {
      logger.error('Training assigned event failed', { error: error.message, data });
    }
  });

  socket.on('munch:training:progress_updated', (data) => {
    try {
      socketService.emit(io, 'training:progress_updated', {
        staffId: data.staffId,
        trainings: data.trainings,
      }, `munch:training:${data.staffId}`);
      logger.info('Training progress updated event emitted', data);
    } catch (error) {
      logger.error('Training progress updated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:training:compliance_assessed', (data) => {
    try {
      socketService.emit(io, 'training:compliance_assessed', {
        staffId: data.staffId,
        isCompliant: data.isCompliant,
        missing: data.missing,
      }, `munch:training:${data.staffId}`);
      logger.info('Training compliance assessed event emitted', data);
    } catch (error) {
      logger.error('Training compliance assessed event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Training points awarded event emitted', data);
    } catch (error) {
      logger.error('Training points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch training', socket.id);
    setupTrainingEvents(io, socket);
  });
}

module.exports = { initialize };