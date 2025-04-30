'use strict';
const { Op, col, fn } = require('sequelize');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mapService = require('@services/common/mapService');
const paymentService = require('@services/common/paymentService');
const { RIDE_TYPES, RIDE_STATUSES, STATUS_TRANSITIONS, PARTICIPANT_STATUSES } = require('@constants/common/rideConstants');
const { Ride, RideParticipant, Customer, Driver, SupportTicket, Payment, DriverRatings, sequelize } = require('@models');

const calculateFare = async ({ distance, ride_type, demand_factor = 1.0, stops = [] }) => {
  const BASE_FARE = 1000;
  const DISTANCE_RATE = 500;
  const STOP_RATE = 200;
  const TYPE_MULTIPLIERS = {
    [RIDE_TYPES.STANDARD]: 1.0,
    [RIDE_TYPES.PREMIUM]: 1.5,
    [RIDE_TYPES.FREE]: 0,
    [RIDE_TYPES.XL]: 1.3,
    [RIDE_TYPES.ECO]: 0.8,
    [RIDE_TYPES.MOTORBIKE]: 0.6,
    [RIDE_TYPES.SCHEDULED]: 1.2,
  };

  const type_multiplier = TYPE_MULTIPLIERS[ride_type] || 1.0;
  const stops_count = Array.isArray(stops) ? stops.length : 0;

  const fare = (BASE_FARE + DISTANCE_RATE * distance + STOP_RATE * stops_count) * type_multiplier * demand_factor;

  return Math.round(fare * 100) / 100;
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const findNearbyDrivers = async ({ pickup, ride_type }, transaction) => {
  const drivers = await Driver.findAll({
    where: {
      availability_status: 'available',
      current_location: { [Op.ne]: null },
      status: 'active',
    },
    attributes: ['id', 'current_location', 'vehicle_info'],
    transaction,
  });

  const validDrivers = drivers.filter((driver) => {
    const { current_location: loc } = driver;
    if (!loc?.lat || !loc?.lng) return false;

    const distance = haversineDistance(pickup.lat, pickup.lng, loc.lat, loc.lng);
    return distance <= 5000;
  });

  return validDrivers;
};

const requestRide = async (rideData, userId, transaction) => {
  const { pickup, dropoff, ride_type = RIDE_TYPES.STANDARD, stops = [], scheduled_time } = rideData;

  const country = await mapService.getCountryFromCoordinates(pickup);
  const resolvedLocations = await Promise.all(
    [pickup, ...stops, dropoff].map(async (loc) => ({
      ...loc,
      resolved: await mapService.resolveLocation(loc),
      country,
    }))
  );

  const distance = await mapService.calculateDistance(resolvedLocations.map((loc) => loc.resolved));
  const demand_factor = 1.0; // Placeholder
  const fare_amount = await calculateFare({ distance: distance / 1000, ride_type, demand_factor, stops });

  let driver = null;
  if (!scheduled_time) {
    const drivers = await findNearbyDrivers({ pickup, ride_type }, transaction);
    driver = drivers[0] || null;
  }

  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    logger.warn('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const status = scheduled_time ? RIDE_STATUSES.SCHEDULED : driver ? RIDE_STATUSES.ASSIGNED : RIDE_STATUSES.REQUESTED;

  const ride = await Ride.create(
    {
      customer_id: customer.id,
      driver_id: driver?.id || null,
      pickup_location: pickup,
      dropoff_location: dropoff,
      ride_type,
      fare_amount,
      stops,
      status,
      scheduled_time,
      distance: distance / 1000,
      demand_factor,
    },
    { transaction }
  );

  if (ride.status === RIDE_STATUSES.ASSIGNED) {
    await Driver.update(
      { availability_status: 'busy' },
      { where: { id: driver.id }, transaction }
    );
  }

  const payment = await paymentService.createPaymentIntent({
    amount: fare_amount,
    customer_id: customer.id,
    ride_id: ride.id,
    type: 'fare',
    metadata: { ride_id: ride.id, payment_method: rideData.payment_method },
  });

  await Ride.update(
    { payment_id: payment.id },
    { where: { id: ride.id }, transaction }
  );

  logger.info('Ride requested', { rideId: ride.id, userId, status, fare_amount });
  return ride;
};

const addRideStop = async (rideId, stop, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }], transaction });
  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to add stop', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }
  if (![RIDE_STATUSES.REQUESTED, RIDE_STATUSES.SCHEDULED, RIDE_STATUSES.ASSIGNED].includes(ride.status)) {
    logger.warn('Cannot add stop to ride in current status', { rideId, status: ride.status });
    throw new AppError('Cannot add stop to ride in current status', 400, 'INVALID_STATUS');
  }

  const resolvedStop = await mapService.resolveLocation(stop);
  const country = await mapService.getCountryFromCoordinates(stop);
  if (country !== (await mapService.getCountryFromCoordinates(ride.pickup_location))) {
    logger.warn('Stop is in a different country', { rideId, country });
    throw new AppError('Stop must be in the same country as pickup', 400, 'INVALID_LOCATION');
  }

  const stops = [...ride.stops, { ...stop, resolved: resolvedStop, country }];
  const locations = [ride.pickup_location, ...stops, ride.dropoff_location];
  const distance = await mapService.calculateDistance(locations.map((loc) => loc.resolved || loc));
  const fare_amount = await calculateFare({
    distance: distance / 1000,
    ride_type: ride.ride_type,
    demand_factor: ride.demand_factor,
    stops,
  });

  await Ride.update(
    { stops, fare_amount, distance: distance / 1000 },
    { where: { id: rideId }, transaction }
  );

  await paymentService.updatePaymentIntent(ride.payment_id, {
    amount: fare_amount,
    metadata: { ride_id: rideId, updated: true },
  });

  logger.info('Stop added to ride', { rideId, stop, userId });
  return { id: rideId, stops, fare_amount, distance: distance / 1000 };
};

const cancelRide = async (rideId, userId, reason, transaction) => {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Driver, as: 'driver' },
      { model: Payment, as: 'payment' },
    ],
    transaction,
  });

  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to cancel ride', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }
  if (![RIDE_STATUSES.REQUESTED, RIDE_STATUSES.SCHEDULED, RIDE_STATUSES.ASSIGNED, RIDE_STATUSES.ARRIVED].includes(ride.status)) {
    logger.warn('Cannot cancel ride in current status', { rideId, status: ride.status });
    throw new AppError('Cannot cancel ride in current status', 400, 'INVALID_STATUS');
  }

  await Ride.update(
    { status: RIDE_STATUSES.CANCELLED, dispute_details: { reason } },
    { where: { id: rideId }, transaction }
  );

  if (ride.driver) {
    await Driver.update(
      { availability_status: 'available' },
      { where: { id: ride.driver.id }, transaction }
    );
  }

  if (ride.payment) {
    await paymentService.cancelPaymentIntent(ride.payment.id);
  }

  logger.info('Ride cancelled', { rideId, userId, reason });
  return { id: rideId, status: RIDE_STATUSES.CANCELLED };
};

const inviteParticipant = async (rideId, customerId, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }], transaction });
  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to invite participant', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }
  if (ride.status !== RIDE_STATUSES.REQUESTED) {
    logger.warn('Cannot invite participant to ride in current status', { rideId, status: ride.status });
    throw new AppError('Cannot invite participant to ride in current status', 400, 'INVALID_STATUS');
  }

  const participant = await Customer.findByPk(customerId, { transaction });
  if (!participant) {
    logger.warn('Participant not found', { customerId, userId });
    throw new AppError('Participant not found', 404, 'NOT_FOUND');
  }

  const existingParticipant = await RideParticipant.findOne({
    where: { ride_id: rideId, customer_id: customerId },
    transaction,
  });
  if (existingParticipant) {
    logger.warn('Participant already invited', { rideId, customerId, userId });
    throw new AppError('Participant already invited', 400, 'ALREADY_INVITED');
  }

  await RideParticipant.create(
    {
      ride_id: rideId,
      customer_id: customerId,
      status: PARTICIPANT_STATUSES.INVITED,
    },
    { transaction }
  );

  logger.info('Participant invited', { rideId, customerId, userId });
  return { rideId, customerId, status: PARTICIPANT_STATUSES.INVITED };
};

const updateRideStatus = async (rideId, status, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }], transaction });
  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to update ride status', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  const validTransitions = STATUS_TRANSITIONS[ride.status] || [];
  if (!validTransitions.includes(status)) {
    logger.warn('Invalid status transition', { rideId, currentStatus: ride.status, newStatus: status });
    throw new AppError(`Cannot transition from ${ride.status} to ${status}`, 400, 'INVALID_STATUS_TRANSITION');
  }

  await Ride.update({ status }, { where: { id: rideId }, transaction });

  if (status === RIDE_STATUSES.COMPLETED && ride.payment_id) {
    await paymentService.authorizePayment(ride.payment_id);
  }

  logger.info('Ride status updated', { rideId, status, userId });
  return { id: rideId, status };
};

const submitRideReview = async (rideId, review, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Driver, as: 'driver' },
    ],
    transaction,
  });

  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to submit review', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }
  if (ride.status !== RIDE_STATUSES.COMPLETED) {
    logger.warn('Cannot review ride that is not completed', { rideId, status: ride.status });
    throw new AppError('Cannot review ride that is not completed', 400, 'INVALID_STATUS');
  }

  const { rating, comment } = review;
  await Ride.update({ review: { rating, comment } }, { where: { id: rideId }, transaction });

  if (ride.driver && rating) {
    await DriverRatings.create(
      {
        driver_id: ride.driver.id,
        ride_id: rideId,
        rating,
      },
      { transaction }
    );

    const ratings = await DriverRatings.findAll({
      where: { driver_id: ride.driver.id },
      attributes: [[fn('AVG', col('rating')), 'avg_rating']],
      transaction,
    });

    const avgRating = parseFloat(ratings[0].get('avg_rating')).toFixed(2);
    await Driver.update(
      { rating: avgRating },
      { where: { id: ride.driver.id }, transaction }
    );
  }

  logger.info('Ride review submitted', { rideId, rating, userId });
  return { id: rideId, review: { rating, comment } };
};

const createSupportTicket = async (rideId, ticketData, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }], transaction });
  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to create support ticket', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  const { subject, description } = ticketData;
  const ticket = await SupportTicket.create(
    {
      customer_id: ride.customer.id,
      ride_id: rideId,
      subject,
      description,
      status: 'open',
    },
    { transaction }
  );

  logger.info('Support ticket created', { ticketId: ticket.id, rideId, userId });
  return ticket;
};

const sendRideMessage = async (rideId, message, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Driver, as: 'driver' },
    ],
    transaction,
  });

  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to send message', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }
  if (![RIDE_STATUSES.ASSIGNED, RIDE_STATUSES.ARRIVED, RIDE_STATUSES.STARTED].includes(ride.status)) {
    logger.warn('Cannot send message in current ride status', { rideId, status: ride.status });
    throw new AppError('Cannot send message in current ride status', 400, 'INVALID_STATUS');
  }

  // Placeholder for messaging logic
  logger.info('Ride message sent', { rideId, message, userId });
  return { rideId, message };
};

const getRideDetails = async (rideId, userId, transaction) => {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Driver, as: 'driver' },
      { model: Payment, as: 'payment' },
      { model: RideParticipant, as: 'participants' },
    ],
    transaction,
  });

  if (!ride) {
    logger.warn('Ride not found', { rideId, userId });
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.customer.user_id !== userId) {
    logger.warn('Unauthorized attempt to view ride details', { rideId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  logger.info('Ride details retrieved', { rideId, userId });
  return ride;
};

const getCustomerHistory = async (userId, transaction) => {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    logger.warn('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const rides = await Ride.findAll({
    where: { customer_id: customer.id },
    include: [
      { model: Driver, as: 'driver' },
      { model: Payment, as: 'payment' },
    ],
    order: [['created_at', 'DESC']],
    transaction,
  });

  logger.info('Customer ride history retrieved', { userId, rideCount: rides.length });
  return rides;
};

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
  getCustomerHistory,
};