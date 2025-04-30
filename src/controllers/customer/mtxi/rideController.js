'use strict';
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerRideService = require('@services/customer/mtxi/rideService');
const faqService = require('@services/common/faqService');
const { sequelize } = require('@models');

const requestRide = catchAsync(async (req, res, next) => {
  const rideData = req.body;
  const userId = req.user.id;

  const ride = await sequelize.transaction(async (transaction) => {
    return await customerRideService.requestRide(rideData, userId, transaction);
  });

  logger.info('Customer requested ride', { rideId: ride.id, userId });
  res.status(201).json({
    status: 'success',
    data: { ride },
  });
});

const addRideStop = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { stop } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.addRideStop(rideId, stop, userId, transaction);
  });

  logger.info('Customer added stop to ride', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const cancelRide = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.cancelRide(rideId, userId, reason, transaction);
  });

  logger.info('Customer cancelled ride', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const inviteParticipant = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { customerId } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.inviteParticipant(rideId, customerId, userId, transaction);
  });

  logger.info('Customer invited participant', { rideId, customerId, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const updateRideStatus = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.updateRideStatus(rideId, status, userId, transaction);
  });

  logger.info('Customer updated ride status', { rideId, status, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const submitRideReview = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.submitRideReview(rideId, { rating, comment }, userId, transaction);
  });

  logger.info('Customer submitted ride review', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const createSupportTicket = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { subject, description } = req.body;
  const userId = req.user.id;

  const ticket = await sequelize.transaction(async (transaction) => {
    return await customerRideService.createSupportTicket(rideId, { subject, description }, userId, transaction);
  });

  logger.info('Customer created support ticket', { ticketId: ticket.id, rideId, userId });
  res.status(201).json({
    status: 'success',
    data: { ticket },
  });
});

const sendRideMessage = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  const result = await sequelize.transaction(async (transaction) => {
    return await customerRideService.sendRideMessage(rideId, message, userId, transaction);
  });

  logger.info('Customer sent ride message', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getRideDetails = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const userId = req.user.id;

  const ride = await sequelize.transaction(async (transaction) => {
    return await customerRideService.getRideDetails(rideId, userId, transaction);
  });

  logger.info('Customer retrieved ride details', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: { ride },
  });
});

const getDriverInfo = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const userId = req.user.id;

  const ride = await sequelize.transaction(async (transaction) => {
    const rideData = await customerRideService.getRideDetails(rideId, userId, transaction);
    if (!rideData.driver) {
      throw new AppError('No driver assigned to ride', 400, 'NO_DRIVER');
    }
    return rideData;
  });

  const driverInfo = {
    name: ride.driver.name,
    phone_number: ride.driver.phone_number,
    vehicle_info: ride.driver.vehicle_info,
    rating: ride.driver.rating,
  };

  logger.info('Customer retrieved driver info', { rideId, userId });
  res.status(200).json({
    status: 'success',
    data: { driver: driverInfo },
  });
});

const getCustomerHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const rides = await sequelize.transaction(async (transaction) => {
    return await customerRideService.getCustomerHistory(userId, transaction);
  });

  logger.info('Customer retrieved ride history', { userId, rideCount: rides.length });
  res.status(200).json({
    status: 'success',
    data: { rides },
  });
});

const getFAQs = catchAsync(async (req, res, next) => {
  const faqs = await faqService.getFAQs();
  logger.info('FAQs retrieved for customer', { userId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { faqs },
  });
});

module.exports = {
  requestRide,
  addRideStop,
  cancelRide,
  inviteParticipant,
  updateRideStatus,
  submitRideReview,
  createSupportTicket,
  sendRideMessage,
  getRideDetails,
  getDriverInfo,
  getCustomerHistory,
  getFAQs,
};