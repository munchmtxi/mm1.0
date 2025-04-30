'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const emitRideJobRequest = (rideId, driverId) => {
  try {
    socketService.emitToRoom(`driver:${driverId}`, 'ride:job', { rideId });
    logger.info('Ride job request emitted', { rideId, driverId });
  } catch (error) {
    logger.error('Failed to emit ride job request', { error: error.message, rideId });
    throw error;
  }
};

const emitRideAccepted = (rideId, driverId) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'ride:driverAssigned', { rideId, driverId });
    socketService.emitToRoom(`driver:${driverId}`, 'ride:driverAssigned', { rideId, driverId });
    logger.info('Ride accepted event emitted', { rideId, driverId });
  } catch (error) {
    logger.error('Failed to emit ride accepted event', { error: error.message, rideId });
    throw error;
  }
};

const emitRideDeclined = (rideId, driverId, declineDetails) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'ride:declined', { rideId, driverId, declineDetails });
    socketService.emitToRoom(`driver:${driverId}`, 'ride:declined', { rideId, driverId, declineDetails });
    socketService.emitToRoom('admin:taxi', 'ride:declined', { rideId, driverId, declineDetails });
    logger.info('Ride declined event emitted', { rideId, driverId, declineDetails });
  } catch (error) {
    logger.error('Failed to emit ride declined event', { error: error.message, rideId });
    throw error;
  }
};

const emitRideStatusUpdated = (rideId, driverId, status) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'ride:statusUpdated', { rideId, status });
    socketService.emitToRoom(`driver:${driverId}`, 'ride:statusUpdated', { rideId, status });
    socketService.emitToRoom('admin:taxi', 'ride:statusUpdated', { rideId, driverId, status });
    logger.info('Ride status updated event emitted', { rideId, driverId, status });
  } catch (error) {
    logger.error('Failed to emit ride status updated event', { error: error.message, rideId });
    throw error;
  }
};

const emitPaymentAuthorized = (rideId, paymentId) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'payment:authorized', { rideId, paymentId });
    socketService.emitToRoom('admin:taxi', 'payment:authorized', { rideId, paymentId });
    logger.info('Payment authorized event emitted', { rideId, paymentId });
  } catch (error) {
    logger.error('Failed to emit payment authorized event', { error: error.message, rideId });
    throw error;
  }
};

module.exports = { emitRideJobRequest, emitRideAccepted, emitRideDeclined, emitRideStatusUpdated, emitPaymentAuthorized };