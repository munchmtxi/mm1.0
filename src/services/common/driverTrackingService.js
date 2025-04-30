'use strict';

const { Driver, Ride } = require('@models');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const updateDriverLocation = async (driverId, location) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    logger.error('Driver not found', { driverId });
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  const activeRide = await Ride.findOne({ where: { driver_id: driverId, status: ['assigned', 'arrived', 'started'] } });
  if (activeRide) {
    socketService.emitToRoom(`ride:${activeRide.id}`, 'location:update', { driverId, location });
    socketService.emitToRoom('admin:taxi', 'location:update', { driverId, rideId: activeRide.id, location });
  }

  logger.info('Driver location updated', { driverId, location });
  return { driverId, location };
};

module.exports = { updateDriverLocation };