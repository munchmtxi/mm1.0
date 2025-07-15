'use strict';

const rideService = require('@services/driver/mtxi/rideService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/rideConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function acceptRide(req, res, next) {
  try {
    const { rideId } = req.params;
    const driverId = req.user.driverId;
    const ride = await rideService.acceptRide(rideId, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: ride,
      message: formatMessage(
        'driver',
        'ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'ride.accepted',
        { rideId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getRideDetails(req, res, next) {
  try {
    const { rideId } = req.params;
    const rideDetails = await rideService.getRideDetails(rideId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: rideDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function updateRideStatus(req, res, next) {
  try {
    const { rideId, status } = req.body;
    const driverId = req.user.driverId;

    await rideService.updateRideStatus(rideId, status, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'ride.status_updated',
        { rideId, status }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function communicateWithPassenger(req, res, next) {
  try {
    const { rideId, message } = req.body;
    const driverId = req.user.driverId;

    await rideService.communicateWithPassenger(rideId, message, driverId, auditService, notificationService, socketService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'ride',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'ride.message_sent',
        { rideId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  acceptRide,
  getRideDetails,
  updateRideStatus,
  communicateWithPassenger,
};