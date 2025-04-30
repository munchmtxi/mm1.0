'use strict';

const driverRideService = require('@services/driver/mtxi/rideService');
const rideEvents = require('@socket/events/driver/mtxi/rideEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { validateRideId, validateDeclineRide, validateRideStatus } = require('@validators/driver/mtxi/rideValidator');

const handleRideAcceptance = catchAsync(async (driverId, rideId) => {
  try {
    // Validate rideId
    const req = { params: { rideId: String(rideId) } };
    await validateRideId[0](req).run(req);
    const errors = validateRideId[1](req, {}, () => {});
    if (errors) throw new AppError('Invalid ride ID', 400, 'INVALID_INPUT');

    const ride = await driverRideService.acceptRide(driverId, rideId);
    rideEvents.emitRideAccepted(rideId, driverId);
    logger.info('Ride acceptance handled', { rideId, driverId });
    return ride;
  } catch (error) {
    logger.error('Failed to handle ride acceptance', { error: error.message, rideId, driverId });
    throw error instanceof AppError ? error : new AppError('Failed to accept ride', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleRideDecline = catchAsync(async (driverId, rideId, declineReason) => {
  try {
    // Validate inputs
    const req = { params: { rideId: String(rideId) }, body: { reason: declineReason } };
    for (const validator of validateDeclineRide.slice(0, -1)) {
      await validator(req).run(req);
    }
    const errors = validateDeclineRide[validateDeclineRide.length - 1](req, {}, () => {});
    if (errors) throw new AppError('Invalid decline inputs', 400, 'INVALID_INPUT');

    const ride = await driverRideService.declineRide(driverId, rideId, { reason: declineReason });
    rideEvents.emitRideDeclined(rideId, driverId, ride.declineDetails);
    logger.info('Ride decline handled', { rideId, driverId, declineReason });
    return ride;
  } catch (error) {
    logger.error('Failed to handle ride decline', { error: error.message, rideId, driverId });
    throw error instanceof AppError ? error : new AppError('Failed to decline ride', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleRideStatusUpdate = catchAsync(async (driverId, rideId, status) => {
  try {
    // Validate inputs
    const req = { params: { rideId: String(rideId) }, body: { status } };
    for (const validator of validateRideStatus.slice(0, -1)) {
      await validator(req).run(req);
    }
    const errors = validateRideStatus[validateRideStatus.length - 1](req, {}, () => {});
    if (errors) throw new AppError('Invalid status inputs', 400, 'INVALID_INPUT');

    const mappedStatus = req.body.status; // Set by validateRideStatus
    const ride = await driverRideService.updateRideStatus(driverId, rideId, mappedStatus);
    rideEvents.emitRideStatusUpdated(rideId, driverId, mappedStatus);
    logger.info('Ride status update handled', { rideId, status: mappedStatus, driverId });
    return ride;
  } catch (error) {
    logger.error('Failed to handle ride status update', { error: error.message, rideId, driverId });
    throw error instanceof AppError ? error : new AppError('Failed to update ride status', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = { handleRideAcceptance, handleRideDecline, handleRideStatusUpdate };