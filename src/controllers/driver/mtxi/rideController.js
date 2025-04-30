'use strict';

const driverRideService = require('@services/driver/mtxi/rideService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { STATUS_MAPPINGS } = require('@constants/common/rideConstants');

const acceptRide = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const ride = await driverRideService.acceptRide(req.user.id, parseInt(rideId));
  logger.info('Driver accepted ride', { rideId, driverId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const declineRide = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { reason } = req.body;
  const ride = await driverRideService.declineRide(req.user.id, parseInt(rideId), { reason });
  logger.info('Driver declined ride', { rideId, driverId: req.user.id, reason });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const updateRideStatus = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { status } = req.body;
  const ride = await driverRideService.updateRideStatus(req.user.id, parseInt(rideId), status);
  logger.info('Driver updated ride status', { rideId, status, driverId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const getDriverReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const report = await driverRideService.getDriverReport(req.user.id, { startDate, endDate });
  logger.info('Driver report retrieved', { driverId: req.user.id, startDate, endDate });
  res.status(200).json({
    status: 'success',
    data: { report },
  });
});

const getRidePayment = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const payment = await driverRideService.getRidePayment(req.user.id, parseInt(rideId));
  logger.info('Driver retrieved ride payment', { rideId, driverId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

module.exports = { acceptRide, declineRide, updateRideStatus, getDriverReport, getRidePayment };