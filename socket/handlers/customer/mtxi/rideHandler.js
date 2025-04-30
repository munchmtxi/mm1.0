'use strict';

const customerRideService = require('@services/customer/mtxi/rideService');
const rideEvents = require('@socket/events/customer/mtxi/rideEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { sequelize } = require('@models');
const { ERROR_CODES } = require('@constants/rideConstants');
const socketService = require('@services/common/socketService');

const eventQueue = [];

const handleRideRequest = catchAsync(async (userId, rideData) => {
  return sequelize.transaction(async (t) => {
    try {
      if (!socketService.io) {
        logger.warn('Socket.IO instance not initialized, queuing ride request event', { userId });
        eventQueue.push({ type: 'rideRequest', userId, rideData });
        throw new AppError('Socket.IO not initialized', 500, ERROR_CODES.SOCKET_NOT_INITIALIZED);
      }

      const ride = await customerRideService.requestRide(rideData, userId, { transaction: t });
      const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId }, transaction: t });
      if (!customer) {
        throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
      }

      rideEvents.emitRideRequested(ride.id, customer.id);
      const nearbyDriverIds = await customerRideService.findNearbyDrivers({ pickup: rideData.pickup, ride_type: rideData.ride_type }, t);
      rideEvents.emitToNearbyDrivers(socketService.io, ride, nearbyDriverIds);

      return ride;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError('Failed to request ride', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  });
});

const handleInviteParticipant = catchAsync(async (userId, rideId, friendId) => {
  try {
    const participant = await customerRideService.inviteParticipant(rideId, friendId, userId);
    const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
    }
    const friend = await sequelize.models.Customer.findByPk(friendId);
    if (!friend) {
      throw new AppError('Friend not found', 404, ERROR_CODES.NOT_FOUND);
    }

    rideEvents.emitParticipantInvited(rideId, customer.id, friend.id);
    logger.info('Participant invite handled', { rideId, userId, friendId });
    return participant;
  } catch (error) {
    logger.error('Failed to handle participant invite', { error: error.message, rideId, userId });
    throw error instanceof AppError ? error : new AppError('Failed to invite participant', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleRideStop = catchAsync(async (userId, rideId, stopLocation) => {
  try {
    const ride = await customerRideService.addRideStop(rideId, stopLocation, userId);
    const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
    }

    rideEvents.emitRideStopAdded(rideId, stopLocation, customer.id);
    logger.info('Ride stop handled', { rideId, userId });
    return ride;
  } catch (error) {
    logger.error('Failed to handle ride stop', { error: error.message, rideId, userId });
    throw error instanceof AppError ? error : new AppError('Failed to add ride stop', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleRideReview = catchAsync(async (userId, rideId, reviewData) => {
  try {
    const review = await customerRideService.submitRideReview(rideId, reviewData, userId);
    const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
    }

    rideEvents.emitRideReviewed(rideId, review.review, customer.id);
    logger.info('Ride review handled', { rideId, userId });
    return review;
  } catch (error) {
    logger.error('Failed to handle ride review', { error: error.message, rideId, userId });
    throw error instanceof AppError ? error : new AppError('Failed to submit ride review', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleSupportTicket = catchAsync(async (userId, ticketData) => {
  try {
    const ticket = await customerRideService.createSupportTicket(ticketData.ride_id, ticketData, userId);
    const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
    }

    rideEvents.emitSupportTicketCreated(ticket.id, customer.id, ticket.subject);
    logger.info('Support ticket handled', { ticketId: ticket.id, userId });
    return ticket;
  } catch (error) {
    logger.error('Failed to handle support ticket', { error: error.message, userId });
    throw error instanceof AppError ? error : new AppError('Failed to create support ticket', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleRideMessage = catchAsync(async (userId, rideId, messageData) => {
  try {
    const message = await customerRideService.sendRideMessage(rideId, messageData, userId);
    rideEvents.emitRideMessage(rideId, message);
    logger.info('Ride message handled', { rideId, userId });
    return message;
  } catch (error) {
    logger.error('Failed to handle ride message', { error: error.message, rideId, userId });
    throw error instanceof AppError ? error : new AppError('Failed to send ride message', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleRideAssigned = catchAsync(async (userId, rideId, driverId) => {
  try {
    const ride = await customerRideService.getRideDetails(rideId, userId);
    if (!ride.driver || ride.driver.id !== driverId) {
      throw new AppError('Driver not assigned to ride', 400, ERROR_CODES.NO_DRIVER);
    }
    const customer = await sequelize.models.Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.NOT_FOUND);
    }

    rideEvents.emitRideAssigned(rideId, driverId, customer.id);
    logger.info('Ride assigned handled', { rideId, userId, driverId });
    return { driverId, rideId };
  } catch (error) {
    logger.error('Failed to handle ride assigned', { error: error.message, rideId, userId });
    throw error instanceof AppError ? error : new AppError('Failed to handle ride assignment', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

// Process queued events when Socket.IO instance is set
const processEventQueue = () => {
  while (eventQueue.length > 0 && socketService.io) {
    const event = eventQueue.shift();
    if (event.type === 'rideRequest') {
      handleRideRequest(event.userId, event.rideData).catch((err) => {
        logger.error('Failed to process queued ride request', { error: err.message, userId: event.userId });
      });
    }
  }
};

socketService.setIoInstance = (io) => {
  socketService._setIoInstance(io);
  processEventQueue();
};

module.exports = {
  handleRideRequest,
  handleInviteParticipant,
  handleRideStop,
  handleRideReview,
  handleSupportTicket,
  handleRideMessage,
  handleRideAssigned,
};