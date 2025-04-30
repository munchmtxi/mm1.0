'use strict';

const mapService = require('@services/common/mapService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const config = require('@config/config');
const { Promotion } = require('@models');
const { Op } = require('sequelize');

const calculateRideDistance = async (pickup, dropoff) => {
  const distance = await mapService.calculateDistance([pickup, dropoff]);
  if (!distance) {
    logger.warn('Failed to calculate distance', { pickup, dropoff });
    throw new AppError('Invalid pickup or dropoff location', 400, 'INVALID_LOCATION');
  }

  logger.info('Ride distance calculated', { pickup, dropoff, distance });
  return distance;
};

const validateLocation = async (location) => {
  const isValid = await mapService.validateAddress(location);
  if (!isValid) {
    logger.warn('Invalid location', { location });
    throw new AppError('Invalid location', 400, 'INVALID_LOCATION');
  }

  logger.info('Location validated', { location });
  return true;
};

const applySurgeAndPromotions = async (ride, demandFactor = 1) => {
  const baseSurge = 1.0;
  let surgeMultiplier = baseSurge;

  if (demandFactor > 1.5) surgeMultiplier = 1.5; // High demand
  else if (demandFactor > 1.2) surgeMultiplier = 1.2; // Moderate demand

  const promotions = await Promotion.findAll({
    where: {
      status: 'active',
      valid_until: { [Op.gte]: new Date() },
      [Op.or]: [{ ride_type: ride.ride_type }, { customer_id: ride.customer_id }, { customer_id: null }],
    },
  });
  let discount = 0;
  for (const promo of promotions) {
    discount = Math.max(discount, promo.discount_percentage);
  }

  const fare = await calculateFare(ride);
  const surgedFare = fare.totalFare * surgeMultiplier;
  const finalFare = surgedFare * (1 - discount / 100);

  logger.info('Surge and promotions applied', { rideId: ride.id, surgeMultiplier, discount, finalFare });
  return { finalFare, surgeMultiplier, discount };
};

const calculateFare = async (ride) => {
  const baseFare = config.pricing.baseFare || 5;
  const perKmRate = config.pricing.perKmRate || 1.5;
  const perMinuteRate = config.pricing.perMinuteRate || 0.3;
  const waitTimeRate = config.pricing.waitTimeRate || 0.5;

  const distance = ride.distance || (await calculateRideDistance(ride.pickup_location, ride.dropoff_location));
  const estimatedTime = distance / (config.pricing.averageSpeed || 30) * 60; // Convert hours to minutes
  const waitTime = ride.wait_time || 0;

  const { surgeMultiplier = 1, discount = 0 } = ride.demandFactor
    ? await applySurgeAndPromotions(ride, ride.demandFactor)
    : {};

  const distanceFee = distance * perKmRate;
  const timeFee = estimatedTime * perMinuteRate;
  const waitTimeFee = waitTime * waitTimeRate;
  const totalFare = (baseFare + distanceFee + timeFee + waitTimeFee) * surgeMultiplier * (1 - discount / 100);

  const driverPercentage = config.pricing.driverPercentage || 0.8;
  const driverShare = totalFare * driverPercentage;
  const adminShare = totalFare * (1 - driverPercentage);

  logger.info('Fare calculated', { rideId: ride.id, totalFare, driverShare, adminShare });
  return { totalFare, driverShare, adminShare };
};

module.exports = { calculateRideDistance, validateLocation, applySurgeAndPromotions, calculateFare };