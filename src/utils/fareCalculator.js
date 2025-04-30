'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const calculateFare = (distanceKm, subscriptionType = null) => {
  try {
    if (distanceKm < 0) {
      logger.warn('Invalid distance for fare calculation', { distanceKm });
      throw new AppError('Distance cannot be negative', 400, 'INVALID_INPUT');
    }

    const baseRate = 5.0; // Base fare in currency units
    const perKmRate = 1.5; // Rate per kilometer
    let discount = 0;

    if (subscriptionType) {
      if (!['ride_basic', 'ride_premium'].includes(subscriptionType)) {
        logger.warn('Invalid subscription type for fare calculation', { subscriptionType });
        throw new AppError('Invalid subscription type', 400, 'INVALID_SUBSCRIPTION');
      }
      discount = subscriptionType === 'ride_premium' ? 0.2 : 0.1; // 20% for premium, 10% for basic
    }

    const baseFare = baseRate + distanceKm * perKmRate;
    const discountedFare = baseFare * (1 - discount);

    const finalFare = Number(discountedFare.toFixed(2));

    logger.info('Fare calculated', { distanceKm, subscriptionType, finalFare });
    return finalFare;
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to calculate fare', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { calculateFare };