'use strict';

const sharedRideService = require('@services/driver/mtxi/sharedRideService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/rideConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function addPassenger(req, res, next) {
  try {
    const { rideId, passengerId } = req.body;
    const driverId = req.user.driverId;
    const ride = await sharedRideService.addPassengerToSharedRide(rideId, passengerId, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: ride,
      message: formatMessage(
        'driver',
        'shared_ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'shared_ride.passenger_added',
        { rideId, passengerId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function removePassenger(req, res, next) {
  try {
    const { rideId, passengerId } = req.body;
    const driverId = req.user.driverId;

    await sharedRideService.removePassengerFromSharedRide(rideId, passengerId, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'shared_ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'shared_ride.passenger_removed',
        { rideId, passengerId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getSharedRideDetails(req, res, next) {
  try {
    const { rideId } = req.params;
    const rideDetails = await sharedRideService.getSharedRideDetails(rideId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: rideDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function optimizeSharedRideRoute(req, res, next) {
  try {
    const { rideId } = req.params;
    const driverId = req.user.driverId;
    const optimizedRoute = await sharedRideService.optimizeSharedRideRoute(rideId, driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: optimizedRoute,
      message: formatMessage(
        'driver',
        'shared_ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'shared_ride.route_optimized',
        { rideId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addPassenger,
  removePassenger,
  getSharedRideDetails,
  optimizeSharedRideRoute,
};