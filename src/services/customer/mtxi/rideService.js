'use strict';

const { Op } = require('sequelize');
const { Ride, Customer, Driver, sequelize } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createRide(rideData, transaction) {
  const { customerId, driverId, pickupLocation, dropoffLocation, rideType, scheduledTime, friends } = rideData;

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  const rideTypeUpper = rideType.toUpperCase();
  if (!customerConstants.MTXI_CONSTANTS.RIDE_TYPES.includes(rideTypeUpper)) {
    throw new AppError('Invalid ride type', 400, customerConstants.ERROR_CODES[7]);
  }

  if (friends && friends.length > customerConstants.MTXI_CONSTANTS.SHARED_RIDE_SETTINGS.MAX_FRIENDS_PER_RIDE) {
    throw new AppError('Max friends exceeded', 400, customerConstants.ERROR_CODES[12]);
  }

  const driver = driverId ? await Driver.findByPk(driverId, { transaction }) : null;
  if (driverId && !driver) throw new AppError('Driver not found', 404, customerConstants.ERROR_CODES[1]);

  const activeRides = await Ride.count({
    where: { customerId, status: { [Op.in]: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] } },
    transaction,
  });
  if (activeRides >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_RIDES) {
    throw new AppError('Max active rides exceeded', 400, customerConstants.ERROR_CODES[7]);
  }

  const ride = await Ride.create(
    {
      customerId,
      driverId: driver?.id || null,
      pickupLocation,
      dropoffLocation,
      rideType: rideTypeUpper,
      status: scheduledTime ? 'SCHEDULED' : 'REQUESTED',
      scheduledTime: scheduledTime || null,
      reference: `RIDE-${Date.now()}`, // Generate reference
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  if (friends && friends.length > 0) {
    for (const friendId of friends) {
      const friend = await Customer.findByPk(friendId, { transaction });
      if (!friend) throw new AppError('Friend not found', 404, customerConstants.ERROR_CODES[13]);
    }
    await ride.addCustomer(friends, { through: 'RideCustomer', transaction });
  }

  logger.info('Ride created', { rideId: ride.id, customerId });
  return ride;
}

async function findAvailableDriver(transaction) {
  const driver = await Driver.findOne({
    where: { availability_status: 'available' },
    attributes: ['id', 'current_location'],
    transaction,
  });

  if (!driver) throw new AppError('No drivers available', 404, customerConstants.ERROR_CODES[1]);

  return driver;
}

async function getRideById(rideId, transaction) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id'] },
      { model: Driver, as: 'driver', attributes: ['current_location', 'user_id'] },
    ],
    transaction,
  });
  if (!ride) throw new AppError('Ride not found', 404, customerConstants.ERROR_CODES[1]);
  return ride;
}

async function updateRideStatus(rideId, status, transaction) {
  if (!customerConstants.MTXI_CONSTANTS.RIDE_STATUSES.includes(status.toUpperCase())) {
    throw new AppError('Invalid status', 400, customerConstants.ERROR_CODES[7]);
  }
  const ride = await getRideById(rideId, transaction);
  await ride.update({ status: status.toUpperCase(), updated_at: new Date() }, { transaction });
  logger.info('Ride status updated', { rideId, status });
}

async function addFriendsToRide(rideId, friends, transaction) {
  const ride = await getRideById(rideId, transaction);
  const currentFriends = await ride.getCustomer({ transaction });
  const totalFriends = currentFriends.length + friends.length;
  if (totalFriends > customerConstants.MTXI_CONSTANTS.SHARED_RIDE_SETTINGS.MAX_FRIENDS_PER_RIDE) {
    throw new AppError('Max friends exceeded', 400, customerConstants.ERROR_CODES[12]);
  }

  for (const friendId of friends) {
    const friend = await Customer.findByPk(friendId, { transaction });
    if (!friend) throw new AppError('Friend not found', 404, customerConstants.ERROR_CODES[13]);
  }

  await ride.addCustomer(friends, { through: 'RideCustomer', transaction });
  logger.info('Friends added to ride', { rideId, friends });
}

async function updateRide(rideId, updateData, transaction) {
  const ride = await getRideById(rideId, transaction);
  const { pickupLocation, dropoffLocation, scheduledTime, friends } = updateData;

  const updates = {};
  if (pickupLocation) updates.pickupLocation = pickupLocation;
  if (dropoffLocation) updates.dropoffLocation = dropoffLocation;
  if (scheduledTime) updates.scheduledTime = scheduledTime;
  if (friends) {
    const totalFriends = friends.length;
    if (totalFriends > customerConstants.MTXI_CONSTANTS.SHARED_RIDE_SETTINGS.MAX_FRIENDS_PER_RIDE) {
      throw new AppError('Max friends exceeded', 400, customerConstants.ERROR_CODES[12]);
    }
    for (const friendId of friends) {
      const friend = await Customer.findByPk(friendId, { transaction });
      if (!friend) throw new AppError('Friend not found', 404, customerConstants.ERROR_CODES[13]);
    }
    await ride.setCustomer(friends, { through: 'RideCustomer', transaction });
  }

  await ride.update({ ...updates, updated_at: new Date() }, { transaction });
  logger.info('Ride updated', { rideId });
}

async function cancelRide(rideId, transaction) {
  const ride = await getRideById(rideId, transaction);
  if (ride.status !== 'REQUESTED' && ride.status !== 'ACCEPTED') {
    throw new AppError('Ride not cancellable', 400, customerConstants.ERROR_CODES[7]);
  }
  await ride.update({ status: 'CANCELLED', updated_at: new Date() }, { transaction });
  logger.info('Ride cancelled', { rideId });
}

async function checkInRide(rideId, transaction) {
  const ride = await getRideById(rideId, transaction);
  if (ride.status !== 'ACCEPTED') {
    throw new AppError('Ride not ready for check-in', 400, customerConstants.ERROR_CODES[7]);
  }
  await ride.update({ status: 'IN_PROGRESS', updated_at: new Date() }, { transaction });
  logger.info('Ride checked in', { rideId });
}

async function getRideHistory(customerId, transaction)Flip
  const rides = await Ride.findAll({
    where: { customerId },
    attributes: ['id', 'reference', 'status', 'created_at'],
    transaction,
  });
  return rides;
}

async function submitFeedback(rideId, feedbackData, transaction) {
  const { rating, comment } = feedbackData;
  if (rating < 1 || rating > 5) throw new AppError('Invalid rating', 400, customerConstants.ERROR_CODES[7]);
  const ride = await getRideById(rideId, transaction);
  const feedback = await ride.createFeedback(
    { rating, comment, customer_id: ride.customerId, staff_id: ride.driverId || null, created_at: new Date() },
    { transaction }
  );
  logger.info('Feedback submitted', { rideId, feedbackId: feedback.id });
  return feedback;
}

module.exports = {
  createRide,
  findAvailableDriver,
  getRideById,
  updateRideStatus,
  addFriendsToRide,
  updateRide,
  cancelRide,
  checkInRide,
  getRideHistory,
  submitFeedback,
};