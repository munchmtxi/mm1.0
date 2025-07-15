'use strict';

const driverEvents = require('@socket/events/admin/mtxi/driverEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils');

function handleDriverEvents(io, socket) {
  socket.on(driverEvents.ASSIGNMENT_UPDATED, async (data) => {
    try {
      await socketService.emit(data.userId, driverEvents.ASSIGNMENT_UPDATED, data);
      logger.info('Assignment updated event handled', { userId: data.userId, driverId: data.driverId });
    } catch (error) {
      logger.logErrorEvent(`handleAssignmentUpdated failed: ${error.message}`, { userId: data.userId });
    }
  });

  socket.on(driverEvents.SAFETY_INCIDENTS_REVIEWED, async (data) => {
    try {
      await socketService.emit(data.userId, driverEvents.SAFETY_INCIDENTS_REVIEWED, data);
      logger.info('Safety incidents reviewed event handled', { userId: data.userId, driverId: data.driverId });
    } catch (error) {
      logger.logErrorEvent(`handleSafetyIncidentsReviewed failed: ${error.message}`, { userId: data.userId });
    }
  });

  socket.on(driverEvents.TRAINING_UPDATED, async (data) => {
    try {
      await socketService.emit(data.userId, driverEvents.TRAINING_UPDATED, data);
      logger.info('Training updated event handled', { userId: data.userId, driverId: data.driverId });
    } catch (error) {
      logger.logErrorEvent(`handleTrainingUpdated failed: ${error.message}`, { userId: data.userId });
    }
  });
}

module.exports = { handleDriverEvents };