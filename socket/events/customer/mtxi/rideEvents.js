'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { ERROR_CODES } = require('@constants/rideConstants');

const emitRideRequested = (rideId, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride requested emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'ride:requested', { rideId });
    socketService.emitToRoom(`ride:${rideId}`, 'ride:requested', { rideId });
    logger.info('Ride requested event emitted', { rideId, customerId });
  } catch (error) {
    logger.error('Failed to emit ride requested event', { error: error.message, rideId });
    throw new AppError('Failed to emit ride requested event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitRideStatusUpdate = (rideId, status, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride status emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'ride:status', { rideId, status });
    socketService.emitToRoom(`ride:${rideId}`, 'ride:status', { rideId, status });
    logger.info('Ride status update emitted for customer', { rideId, status, customerId });
  } catch (error) {
    logger.error('Failed to emit ride status update', { error: error.message, rideId });
    throw new AppError('Failed to emit ride status update', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitParticipantInvited = (rideId, customerId, friendId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping participant invited emission', { rideId, customerId, friendId });
      return;
    }
    socketService.emitToRoom(`customer:${friendId}`, 'ride:participantInvited', { rideId, inviterId: customerId });
    socketService.emitToRoom(`ride:${rideId}`, 'ride:participantInvited', { rideId, friendId });
    logger.info('Participant invited event emitted', { rideId, customerId, friendId });
  } catch (error) {
    logger.error('Failed to emit participant invited event', { error: error.message, rideId });
    throw new AppError('Failed to emit participant invited event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitRideStopAdded = (rideId, stopLocation, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride stop emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`ride:${rideId}`, 'ride:stopAdded', { rideId, stopLocation, customerId });
    socketService.emitToRoom(`customer:${customerId}`, 'ride:stopAdded', { rideId, stopLocation });
    logger.info('Ride stop added event emitted', { rideId, customerId });
  } catch (error) {
    logger.error('Failed to emit ride stop added event', { error: error.message, rideId });
    throw new AppError('Failed to emit ride stop added event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitRideReviewed = (rideId, review, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride reviewed emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`ride:${rideId}`, 'ride:reviewed', { rideId, review, customerId });
    socketService.emitToRoom(`customer:${customerId}`, 'ride:reviewed', { rideId, review });
    logger.info('Ride reviewed event emitted', { rideId, customerId });
  } catch (error) {
    logger.error('Failed to emit ride reviewed event', { error: error.message, rideId });
    throw new AppError('Failed to emit ride reviewed event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitSupportTicketCreated = (ticketId, customerId, subject) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping support ticket emission', { ticketId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'support:ticketCreated', { ticketId, customerId, subject });
    logger.info('Support ticket created event emitted', { ticketId, customerId });
  } catch (error) {
    logger.error('Failed to emit support ticket created event', { error: error.message, ticketId });
    throw new AppError('Failed to emit support ticket created event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitRideMessage = (rideId, message) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride message emission', { rideId });
      return;
    }
    socketService.emitToRoom(`ride:${rideId}`, 'ride:message', message);
    logger.info('Ride message event emitted', { rideId });
  } catch (error) {
    logger.error('Failed to emit ride message event', { error: error.message, rideId });
    throw new AppError('Failed to emit ride message event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitRideAssigned = (rideId, driverId, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping ride assigned emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'ride:assigned', { rideId, driverId });
    socketService.emitToRoom(`ride:${rideId}`, 'ride:assigned', { rideId, driverId });
    logger.info('Ride assigned event emitted', { rideId, driverId, customerId });
  } catch (error) {
    logger.error('Failed to emit ride assigned event', { error: error.message, rideId });
    throw new AppError('Failed to emit ride assigned event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitToNearbyDrivers = (io, ride, nearbyDriverIds = []) => {
  socketService.emitToNearbyDrivers(ride.id, nearbyDriverIds, {
    rideId: ride.id,
    customerId: ride.customer_id,
    pickupLocation: ride.pickup_location,
  });
};

const emitPaymentAuthorized = (rideId, paymentId, amount, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping payment authorized emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'payment:authorized', { rideId, paymentId, amount });
    socketService.emitToRoom(`ride:${rideId}`, 'payment:authorized', { rideId, paymentId, amount });
    logger.info('Payment authorized event emitted', { rideId, paymentId, customerId });
  } catch (error) {
    logger.error('Failed to emit payment authorized event', { error: error.message, rideId });
    throw new AppError('Failed to emit payment authorized event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

const emitPaymentConfirmed = (rideId, paymentId, customerId) => {
  try {
    if (!socketService.io) {
      logger.warn('Socket.IO instance not initialized, skipping payment confirmed emission', { rideId, customerId });
      return;
    }
    socketService.emitToRoom(`customer:${customerId}`, 'payment:confirmed', { rideId, paymentId });
    socketService.emitToRoom(`ride:${rideId}`, 'payment:confirmed', { rideId, paymentId });
    logger.info('Payment confirmed event emitted', { rideId, paymentId, customerId });
  } catch (error) {
    logger.error('Failed to emit payment confirmed event', { error: error.message, rideId });
    throw new AppError('Failed to emit payment confirmed event', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  emitRideRequested,
  emitRideStatusUpdate,
  emitParticipantInvited,
  emitRideStopAdded,
  emitRideReviewed,
  emitSupportTicketCreated,
  emitRideMessage,
  emitRideAssigned,
  emitToNearbyDrivers,
  emitPaymentAuthorized,
  emitPaymentConfirmed,
};