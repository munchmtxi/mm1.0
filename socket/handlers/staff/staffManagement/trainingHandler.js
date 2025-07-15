'use strict';

const socketService = require('@services/common/socketService');
const trainingEvents = require('@socket/events/staff/staffManagement/training.events');
const logger = require('@utils/logger');

function setupTrainingHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(trainingEvents.TRAINING_ASSIGNED, (data) => {
      logger.info('Training assigned event received', { data });
      socketService.emit(`munch:training:${data.staffId}`, trainingEvents.TRAINING_ASSIGNED, data);
    });

    socket.on(trainingEvents.TRAINING_PROGRESS_UPDATED, (data) => {
      logger.info('Training progress updated event received', { data });
      socketService.emit(`munch:training:${data.staffId}`, trainingEvents.TRAINING_PROGRESS_UPDATED, data);
    });

    socket.on(trainingEvents.TRAINING_COMPLIANCE_ASSESSED, (data) => {
      logger.info('Training compliance assessed event received', { data });
      socketService.emit(`munch:training:${data.staffId}`, trainingEvents.TRAINING_COMPLIANCE_ASSESSED, data);
    });

    socket.on(trainingEvents.POINTS_AWARDED, (data) => {
      logger.info('Points awarded event received', { data });
      socketService.emit(`munch:staff:${data.staffId}`, trainingEvents.POINTS_AWARDED, data);
    });

    socket.on(trainingEvents.BADGE_AWARDED, (data) => {
      logger.info('Badge awarded event received', { data });
      socketService.emit(`munch:staff:${data.staffId}`, trainingEvents.BADGE_AWARDED, data);
    });
  });
}

module.exports = { setupTrainingHandlers };