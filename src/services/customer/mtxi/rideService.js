'use strict';

const { Ride, Customer, Wallet, Driver, sequelize } = require('@models');
const locationService = require('@services/common/locationService');
const walletService = require('@services/common/walletService');
const rideConstants = require('@constants/common/rideConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function createRide(rideData, transaction) {
  const { customerId, driverId, pickupLocation, dropoffLocation, rideType, scheduledTime, friends, billSplit } = rideData;

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!rideConstants.RIDE_TYPES.includes(rideType)) {
    throw new AppError('Invalid ride type', 400, rideConstants.ERROR_CODES[0]);
  }

  const resolvedPickup = await locationService.resolveLocation(pickupLocation, customerId, transaction);
  const resolvedDropoff = await locationService.resolveLocation(dropoffLocation, customerId, transaction);

  const driver = driverId ? await Driver.findByPk(driverId, { transaction }) : null;
  if (driverId && !driver) throw new AppError('No drivers available', 404, rideConstants.ERROR_CODES[6]);

  const ride = await Ride.create(
    {
      customerId,
      driverId: driver?.id || null,
      pickupLocation: resolvedPickup,
      dropoffLocation: resolvedDropoff,
      rideType,
      status: scheduledTime ? rideConstants.RIDE_STATUSES[0] : rideConstants.RIDE_STATUSES[1],
      scheduledTime: scheduledTime || null,
      friends: friends || [],
      billSplit: billSplit || null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Ride created', { rideId: ride.id, customerId });
  return ride;
}

async function findAvailableDriver(location) {
  const driver = await Driver.findOne({
    where: { availability_status: 'available' },
    attributes: ['id', 'current_location'],
  });

  if (!driver) throw new AppError('No drivers available', 404, rideConstants.ERROR_CODES[6]);

  const distance = await locationService.calculateDistance(location, driver.current_location);
  if (distance > rideConstants.RIDE_SETTINGS.MAX_RIDE_DISTANCE_KM) {
    throw new AppError('No drivers in range', 404, rideConstants.ERROR_CODES[6]);
  }

  return driver;
}

async function getRideById(rideId, transaction) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id'] },
      { model: Driver, as: 'driver', attributes: ['current_location', 'user_id'] },
      { model: Wallet, as: 'wallet', attributes: ['id', 'balance', 'currency'] },
    ],
    transaction,
  });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES[1]);
  return ride;
}

async function updateRideStatus(rideId, status, transaction) {
  if (!rideConstants.RIDE_STATUSES.includes(status)) {
    throw new AppError('Invalid status', 400, rideConstants.ERROR_CODES[0]);
  }
  const ride = await getRideById(rideId, transaction);
  await ride.update({ status, updated_at: new Date() }, { transaction });
  logger.info('Ride status updated', { rideId, status });
}

async function processBillSplit(rideId, billSplit, transaction) {
  const { type, participants } = billSplit;
  if (!rideConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES.includes(type)) {
    throw new AppError('Invalid bill split type', 400, rideConstants.ERROR_CODES[12]);
  }
  if (participants.length > rideConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new AppError('Too many participants', 400, rideConstants.ERROR_CODES[6]);
  }

  const ride = await getRideById(rideId, transaction);
  const totalAmount = ride.payment?.amount || 100;
  const splitAmount = type === 'equal' ? totalAmount / participants.length : participants.map(p => p.amount);

  for (const [index, participant] of participants.entries()) {
    const customer = await Customer.findByPk(participant.customerId, { transaction });
    if (!customer) throw new AppError('Participant not found', 404, rideConstants.ERROR_CODES[13]);
    const wallet = await Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
    if (!wallet) throw new AppError('Wallet not found', 404, customerConstants.ERROR_CODES[1]);

    const amount = type === 'equal' ? splitAmount : splitAmount[index];
    await walletService.processTransaction(
      wallet.id,
      {
        type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[1],
        amount,
        currency: wallet.currency,
        paymentMethodId: participant.paymentMethodId,
      },
      { transaction }
    );
  }

  await ride.update({ billSplit }, { transaction });
  logger.info('Bill split processed', { rideId, billSplit });
}

async function addFriendsToRide(rideId, friends, transaction) {
  if (friends.length > rideConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_RIDE) {
    throw new AppError('Too many friends', 400, rideConstants.ERROR_CODES[11]);
  }

  const ride = await getRideById(rideId, transaction);
  for (const friendId of friends) {
    const friend = await Customer.findByPk(friendId, { transaction });
    if (!friend) throw new AppError('Friend not found', 404, rideConstants.ERROR_CODES[13]);
  }

  await ride.update({ friends: [...(ride.friends || []), ...friends] }, { transaction });
  logger.info('Friends added to ride', { rideId, friends });
}

async function updateRide(rideId, updateData, transaction) {
  const ride = await getRideById(rideId, transaction);
  const { pickupLocation, dropoffLocation, scheduledTime, friends, billSplit } = updateData;

  const updates = {};
  if (pickupLocation) updates.pickupLocation = await locationService.resolveLocation(pickupLocation, ride.customerId, transaction);
  if (dropoffLocation) updates.dropoffLocation = await locationService.resolveLocation(dropoffLocation, ride.customerId, transaction);
  if (scheduledTime) updates.scheduledTime = scheduledTime;
  if (friends) {
    if (friends.length > rideConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_RIDE) {
      throw new AppError('Too many friends', 400, rideConstants.ERROR_CODES[11]);
    }
    for (const friendId of friends) {
      const friend = await Customer.findByPk(friendId, { transaction });
      if (!friend) throw new AppError('Friend not found', 404, rideConstants.ERROR_CODES[13]);
    }
    updates.friends = friends;
  }
  if (billSplit) {
    if (!rideConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES.includes(billSplit.type)) {
      throw new AppError('Invalid bill split type', 400, rideConstants.ERROR_CODES[12]);
    }
    updates.billSplit = billSplit;
  }

  await ride.update({ ...updates, updated_at: new Date() }, { transaction });
  logger.info('Ride updated', { rideId });
}

async function cancelRide(rideId, transaction) {
  const ride = await getRideById(rideId, transaction);
  if (!rideConstants.RIDE_STATUSES.includes('cancelled')) {
    throw new AppError('Ride not cancellable', 400, rideConstants.ERROR_CODES[8]);
  }
  await ride.update({ status: 'cancelled', updated_at: new Date() }, { transaction });
  logger.info('Ride cancelled', { rideId });
}

async function checkInRide(rideId, coordinates, transaction) {
  const ride = await getRideById(rideId, transaction);
  if (ride.status !== 'accepted') {
    throw new AppError('Ride not ready for check-in', 400, rideConstants.ERROR_CODES[0]);
  }
  const distance = await locationService.calculateDistance(coordinates, ride.pickupLocation);
  if (distance > rideConstants.RIDE_SETTINGS.MAX_RIDE_DISTANCE_KM) {
    throw new AppError('Invalid check-in location', 400, rideConstants.ERROR_CODES[9]);
  }
  await ride.update({ status: 'in_progress', updated_at: new Date() }, { transaction });
  logger.info('Ride checked in', { rideId });
}

async function getRideHistory(customerId, transaction) {
  const rides = await Ride.findAll({
    where: { customerId },
    attributes: ['id', 'reference', 'status', 'created_at'],
    transaction,
  });
  return rides;
}

async function submitFeedback(rideId, feedbackData, transaction) {
  const { rating, comment } = feedbackData;
  if (rating < 1 || rating > 5) {
    throw new AppError('Invalid rating', 400, customerConstants.ERROR_CODES[0]);
  }
  const ride = await getRideById(rideId, transaction);
  const feedback = await ride.createFeedback({ rating, comment, created_at: new Date() }, { transaction });
  logger.info('Feedback submitted', { rideId, feedbackId: feedback.id });
  return feedback;
}

module.exports = {
  createRide,
  findAvailableDriver,
  getRideById,
  updateRideStatus,
  processBillSplit,
  addFriendsToRide,
  updateRide,
  cancelRide,
  checkInRide,
  getRideHistory,
  submitFeedback,
};