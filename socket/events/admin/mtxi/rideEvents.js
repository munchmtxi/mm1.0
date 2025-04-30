'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const rideConstants = require('@constants/admin/rideConstants');
const {
  handleRideAlert,
  handleRideStatusUpdate,
  handleRideDispute,
  handleAssignDriver,
  handleTrackDriverLocation,
  handleLiveTripMetrics,
  handlePaymentDispute,
} = require('@socket/handlers/admin/mtxi/rideHandler');

const emitRideAlert = (rideId, alertData) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'ride:alert', {
      rideId,
      ...alertData,
    });
    logger.info('Ride alert emitted', { rideId, alertData });
  } catch (error) {
    logger.error('Failed to emit ride alert', { error: error.message, rideId });
  }
};

const emitRideStatusUpdate = (rideId, status) => {
  try {
    if (!Object.values(rideConstants.RIDE_STATUSES).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    socketService.emitToRoom(`ride:${rideId}`, 'ride:statusUpdated', { rideId, status });
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'ride:statusUpdated', { rideId, status });
    logger.info('Ride status update emitted', { rideId, status });
  } catch (error) {
    logger.error('Failed to emit ride status update', { error: error.message, rideId });
  }
};

const emitRideDispute = (rideId, disputeData) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'ride:disputeResolved', disputeData);
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'ride:disputeResolved', disputeData);
    logger.info('Ride dispute emitted', { rideId, disputeData });
  } catch (error) {
    logger.error('Failed to emit ride dispute', { error: error.message, rideId });
  }
};

const emitDriverAssigned = (rideId, driverId, customerId) => {
  try {
    socketService.emitToRoom(`ride:${rideId}`, 'ride:driverAssigned', { rideId, driverId, customerId });
    socketService.emitToRoom(`driver:${driverId}`, 'ride:assigned', { rideId, customerId });
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'ride:driverAssigned', { rideId, driverId, customerId });
    logger.info('Driver assigned event emitted', { rideId, driverId });
  } catch (error) {
    logger.error('Failed to emit driver assigned event', { error: error.message, rideId });
  }
};

const emitDriverLocation = (driverId, location, status, rideId) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'driver:location', { driverId, location, status, rideId });
    logger.info('Driver location event emitted', { driverId, location, rideId });
  } catch (error) {
    logger.error('Failed to emit driver location event', { error: error.message, driverId });
  }
};

const emitLiveTripMetrics = (metrics) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'live:metrics', metrics);
    logger.info('Live trip metrics event emitted', { metrics });
  } catch (error) {
    logger.error('Failed to emit live trip metrics event', { error: error.message });
  }
};

const emitPaymentDisputed = (paymentId, disputeData) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'payment:disputed', disputeData);
    logger.info('Payment disputed event emitted', { paymentId, disputeData });
  } catch (error) {
    logger.error('Failed to emit payment disputed event', { error: error.message, paymentId });
  }
};

const emitPaymentAuthorized = (rideId, paymentId, details) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'payment:authorized', { rideId, paymentId, ...details });
    logger.info('Payment authorized event emitted to admin', { rideId, paymentId, details });
  } catch (error) {
    logger.error('Failed to emit payment authorized event', { error: error.message, rideId });
  }
};

const emitPaymentConfirmed = (rideId, paymentId, details) => {
  try {
    socketService.emitToRoom(rideConstants.ROOMS.ADMIN_TAXI, 'payment:confirmed', { rideId, paymentId, ...details });
    logger.info('Payment confirmed event emitted to admin', { rideId, paymentId, details });
  } catch (error) {
    logger.error('Failed to emit payment confirmed event', { error: error.message, rideId });
  }
};

module.exports = (io, socket) => {
  logger.info('Setting up ride events', { userId: socket.user?.id });

  socket.on('ride:alert', async (data, callback) => {
    logger.info('Received ride:alert event', { userId: socket.user?.id, data });
    try {
      const alert = await handleRideAlert(data.rideId, data.alertData, socket.user?.id, socket);
      callback({ status: 'success', data: { alert } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('ride:statusUpdate', async (data, callback) => {
    logger.info('Received ride:statusUpdate event', { userId: socket.user?.id, data });
    try {
      const ride = await handleRideStatusUpdate(data.rideId, data.status, socket.user?.id, socket);
      callback({ status: 'success', data: { ride } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('ride:dispute', async (data, callback) => {
    logger.info('Received ride:dispute event', { userId: socket.user?.id, data });
    try {
      const dispute = await handleRideDispute(data.rideId, data.resolution, socket.user?.id, socket);
      callback({ status: 'success', data: { dispute } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('ride:assignDriver', async (data, callback) => {
    logger.info('Received ride:assignDriver event', { userId: socket.user?.id, data });
    try {
      const ride = await handleAssignDriver(data.rideId, data.driverId, socket.user?.id, socket);
      callback({ status: 'success', data: { ride } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('driver:trackLocation', async (data, callback) => {
    logger.info('Received driver:trackLocation event', { userId: socket.user?.id, data });
    try {
      const location = await handleTrackDriverLocation(data.rideId, socket.user?.id, socket);
      callback({ status: 'success', data: { location } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('ride:liveMetrics', async (data, callback) => {
    logger.info('Received ride:liveMetrics event', { userId: socket.user?.id, data });
    try {
      const metrics = await handleLiveTripMetrics(socket.user?.id, socket);
      callback({ status: 'success', data: { metrics } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });

  socket.on('payment:dispute', async (data, callback) => {
    logger.info('Received payment:dispute event', { userId: socket.user?.id, data });
    try {
      const dispute = await handlePaymentDispute(data.paymentId, data.resolution, socket.user?.id, socket);
      callback({ status: 'success', data: { dispute } });
    } catch (error) {
      callback({ status: 'error', error: error.message });
    }
  });
};

module.exports = {
  emitRideAlert,
  emitRideStatusUpdate,
  emitRideDispute,
  emitDriverAssigned,
  emitDriverLocation,
  emitLiveTripMetrics,
  emitPaymentDisputed,
  emitPaymentAuthorized,
  emitPaymentConfirmed,
};