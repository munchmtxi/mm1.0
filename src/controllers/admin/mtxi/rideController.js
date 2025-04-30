'use strict';

const adminRideService = require('@services/admin/mtxi/adminRideService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const getRideDetails = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const ride = await adminRideService.getRideDetails(rideId);
  logger.info('Admin retrieved ride details', { rideId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const updateRideStatus = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { status } = req.body;
  if (!status) {
    return next(new AppError('Status is required', 400, 'INVALID_INPUT'));
  }
  const ride = await adminRideService.updateRideStatus(rideId, status);
  logger.info('Admin updated ride status', { rideId, status, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const handleRideAlert = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { message, severity } = req.body;
  const alert = await adminRideService.handleRideAlert(rideId, { message, severity });
  logger.info('Admin issued ride alert', { rideId, adminId: req.user.id, severity });
  res.status(200).json({
    status: 'success',
    data: { alert },
  });
});

const handleRideDispute = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { action, reason } = req.body;
  const dispute = await adminRideService.handleRideDispute(rideId, { action, reason });
  logger.info('Admin handled ride dispute', { rideId, adminId: req.user.id, action });
  res.status(200).json({
    status: 'success',
    data: { dispute },
  });
});

const getRideAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate, status, reportType } = req.query;
  const filters = { startDate, endDate, status };
  const analytics = await adminRideService.getRideAnalytics(filters, reportType);
  logger.info('Admin retrieved ride analytics', { filters, reportType, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { analytics },
  });
});

const assignDriverToRide = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { driverId } = req.body;
  if (!driverId) {
    return next(new AppError('Driver ID is required', 400, 'INVALID_INPUT'));
  }
  const ride = await adminRideService.assignDriverToRide(rideId, driverId);
  logger.info('Admin assigned driver to ride', { rideId, driverId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const trackDriverLocation = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const location = await adminRideService.trackDriverLocation(rideId);
  logger.info('Admin tracked driver location', { rideId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { location },
  });
});

const getLiveTripMetrics = catchAsync(async (req, res, next) => {
  const metrics = await adminRideService.getLiveTripMetrics();
  logger.info('Admin retrieved live trip metrics', { adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { metrics },
  });
});

const getPaymentDetails = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await adminRideService.getPaymentDetails(req.user.id, null, paymentId);
  logger.info('Admin retrieved payment details', { paymentId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

const getRidePayments = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  logger.debug('Processing ride payments request', { rideId, adminId: req.user.id });
  if (!rideId) {
    logger.warn('Missing rideId in request parameters', { params: req.params });
    return next(new AppError('Ride ID is required', 400, 'INVALID_INPUT'));
  }
  const payment = await adminRideService.getPaymentDetails(req.user.id, rideId);
  logger.info('Admin retrieved ride payment details', { rideId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

const analyzePayments = catchAsync(async (req, res, next) => {
  const { startDate, endDate, type, status } = req.query;
  const filters = { startDate, endDate, type, status };
  const payments = await adminRideService.analyzePayments(filters);
  logger.info('Admin analyzed payments', { filters, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { payments },
  });
});

const disputePayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const { action, reason } = req.body;
  if (!action || !reason) {
    return next(new AppError('Action and reason are required', 400, 'INVALID_INPUT'));
  }
  const resolution = await adminRideService.disputePayment(paymentId, { action, reason });
  logger.info('Admin disputed payment', { paymentId, action, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { resolution },
  });
});

module.exports = {
  getRideDetails,
  updateRideStatus,
  handleRideAlert,
  handleRideDispute,
  getRideAnalytics,
  assignDriverToRide,
  trackDriverLocation,
  getLiveTripMetrics,
  getPaymentDetails,
  getRidePayments,
  analyzePayments,
  disputePayment,
};