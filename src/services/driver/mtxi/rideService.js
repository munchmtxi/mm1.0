'use strict';

const { Ride, Customer, Driver, Vehicle, DriverRatings, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/mtxiConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function acceptRide(rideId, driverId) {
  const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }] });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  if (ride.status !== rideConstants.RIDE_STATUSES.REQUESTED) {
    throw new AppError('Ride cannot be accepted', 400, rideConstants.ERROR_TYPES.RIDE_NOT_CANCELLABLE);
  }
  if (ride.rideType === rideConstants.RIDE_TYPES.SHARED.name && ride.customer.length >= rideConstants.RIDE_TYPES.SHARED.maxPassengers) {
    throw new AppError('Shared ride at capacity', 400, rideConstants.ERROR_TYPES.INVALID_RIDE);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
  if (!driver || driver.status !== driverConstants.DRIVER_STATUSES.available) {
    throw new AppError('Driver unavailable', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const vehicle = driver.vehicles.find(v => v.capacity >= (ride.customer.length || 1) && v.status === vehicleConstants.VEHICLE_STATUSES.active);
  if (!vehicle) {
    throw new AppError('No suitable vehicle available', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const transaction = await sequelize.transaction();
  try {
    await ride.update(
      { status: rideConstants.RIDE_STATUSES.ACCEPTED, driverId, updated_at: new Date() },
      { transaction }
    );
    await Driver.update(
      { availability_status: driverConstants.DRIVER_STATUSES.on_ride },
      { where: { id: driverId }, transaction }
    );
    await transaction.commit();
    logger.info('Ride accepted', { rideId, driverId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Accept ride failed: ${error.message}`, 500, rideConstants.ERROR_TYPES.RIDE_CREATION_FAILED);
  }
}

async function getRideDetails(rideId, countryCode = localizationConstants.DEFAULT_COUNTRY) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number', 'country'] },
      { model: Driver, as: 'driver', attributes: ['name', 'phone_number', 'rating'] },
    ],
  });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);

  const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;
  logger.info('Ride details retrieved', { rideId });
  return {
    rideId: ride.id,
    customer: ride.customer.map(c => ({ ...c.toJSON(), currency })),
    driver: ride.driver,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    status: ride.status,
    rideType: ride.rideType,
    scheduledTime: ride.scheduledTime ? new Date(ride.scheduledTime).toLocaleString(localizationConstants.SUPPORTED_LANGUAGES.includes(ride.customer[0]?.country || 'en') ? ride.customer[0].country : localizationConstants.DEFAULT_LANGUAGE, {
      timeZone: localizationConstants.DEFAULT_TIMEZONE,
      dateStyle: localizationConstants.LOCALIZATION_SETTINGS.DATE_FORMATS[countryCode],
      timeStyle: localizationConstants.LOCALIZATION_SETTINGS.TIME_FORMATS[countryCode],
    }) : null,
  };
}

async function updateRideStatus(rideId, status, driverId) {
  if (!rideConstants.RIDE_STATUSES.includes(status)) {
    throw new AppError('Invalid status', 400, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }

  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  const transaction = await sequelize.transaction();
  try {
    await ride.update({ status, updated_at: new Date() }, { transaction });
    if (status === rideConstants.RIDE_STATUSES.COMPLETED || status === rideConstants.RIDE_STATUSES.CANCELLED) {
      await Driver.update(
        { availability_status: driverConstants.DRIVER_STATUSES.available },
        { where: { id: driverId }, transaction }
      );
    }
    await transaction.commit();
    logger.info('Ride status updated', { rideId, status });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update ride status failed: ${error.message}`, 500, rideConstants.ERROR_TYPES.RIDE_CANCELLATION_FAILED);
  }
}

async function communicateWithPassenger(rideId, message, driverId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  logger.info('Message sent to passenger', { rideId, driverId });
  return { rideId, message, sender: 'driver', customerId: ride.customerId };
}

async function getAvailableRides(driverId, countryCode = localizationConstants.DEFAULT_COUNTRY) {
  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Vehicle, as: 'vehicles' },
      { model: DriverAvailability, as: 'availability' },
    ],
  });
  if (!driver || driver.status !== driverConstants.DRIVER_STATUSES.available) {
    throw new AppError('Driver unavailable', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const today = new Date().toISOString().split('T')[0];
  const availability = driver.availability.find(a => a.date === today && a.status === driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.available);
  if (!availability) {
    throw new AppError('Driver not available today', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const rides = await Ride.findAll({
    where: {
      status: rideConstants.RIDE_STATUSES.REQUESTED,
      driverId: null,
      pickupLocation: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('ST_DWithin',
              sequelize.col('pickup_location'),
              sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', driver.current_location.coordinates[0], driver.current_location.coordinates[1]), 4326),
              rideConstants.RIDE_CONFIG.MAX_RANGE_KM * 1000
            ),
            true
          ),
        ],
      },
    },
    include: [{ model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'country'] }],
  });

  const suitableRides = rides.filter(ride => {
    const requiredCapacity = ride.customer.length || 1;
    return driver.vehicles.some(v => v.capacity >= requiredCapacity && v.status === vehicleConstants.VEHICLE_STATUSES.active) &&
           rideConstants.RIDE_CONFIG.SUPPORTED_CITIES[countryCode]?.includes(ride.pickupLocation.city);
  });

  logger.info('Available rides retrieved', { driverId, count: suitableRides.length });
  return suitableRides.map(ride => ({
    rideId: ride.id,
    customer: ride.customer,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    rideType: ride.rideType,
    scheduledTime: ride.scheduledTime ? new Date(ride.scheduledTime).toLocaleString(localizationConstants.DEFAULT_LANGUAGE, {
      timeZone: localizationConstants.DEFAULT_TIMEZONE,
      dateStyle: localizationConstants.LOCALIZATION_SETTINGS.DATE_FORMATS[countryCode],
      timeStyle: localizationConstants.LOCALIZATION_SETTINGS.TIME_FORMATS[countryCode],
    }) : null,
  }));
}

async function cancelRideAssignment(rideId, driverId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }
  if (ride.status !== rideConstants.RIDE_STATUSES.ACCEPTED) {
    throw new AppError('Ride cannot be cancelled', 400, rideConstants.ERROR_TYPES.RIDE_NOT_CANCELLABLE);
  }

  const transaction = await sequelize.transaction();
  try {
    await ride.update({ status: rideConstants.RIDE_STATUSES.REQUESTED, driverId: null, updated_at: new Date() }, { transaction });
    await Driver.update(
      { availability_status: driverConstants.DRIVER_STATUSES.available },
      { where: { id: driverId }, transaction }
    );
    await transaction.commit();
    logger.info('Ride assignment cancelled', { rideId, driverId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Cancel ride assignment failed: ${error.message}`, 500, rideConstants.ERROR_TYPES.RIDE_CANCELLATION_FAILED);
  }
}

// New function: Estimate ride fare
async function estimateRideFare(rideId, driverId, countryCode = localizationConstants.DEFAULT_COUNTRY) {
  const ride = await Ride.findByPk(rideId, {
    include: [{ model: Route, as: 'route' }],
  });
  if (!ride) throw new AppError('Ride not found', 404, rideConstants.ERROR_TYPES.RIDE_NOT_FOUND);
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  const rideTypeConfig = rideConstants.RIDE_TYPES[ride.rideType.toUpperCase()];
  const baseFare = rideTypeConfig.baseFare || 5.0;
  const perKmRate = rideConstants.RIDE_CONFIG.DYNAMIC_PRICING.surgeMultiplierMax > 1 ? 1.5 : 1.2; // Example surge logic
  const distance = ride.route?.distance || 10; // Default to 10km if unavailable
  const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;

  const estimatedFare = baseFare + (distance * perKmRate);
  logger.info('Ride fare estimated', { rideId, estimatedFare });
  return { rideId, estimatedFare, currency, distance };
}

// New function: Get driver performance overview
async function getDriverPerformanceOverview(driverId, period = driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.monthly) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 400, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const dateRange = {
    daily: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 1)) },
    weekly: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 7)) },
    monthly: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
    yearly: { [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
  }[period] || { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) };

  const rides = await Ride.findAll({
    where: {
      driverId,
      status: rideConstants.RIDE_STATUSES.COMPLETED,
      created_at: dateRange,
    },
    include: [{ model: DriverRatings, as: 'rating' }],
  });

  const totalRides = rides.length;
  const totalDistance = rides.reduce((sum, ride) => sum + (ride.route?.distance || 0), 0);
  const averageRating = rides.reduce((sum, ride) => sum + (ride.rating?.rating || 0), 0) / (rides.length || 1);
  const completionRate = totalRides / (await Ride.count({ where: { driverId, created_at: dateRange } }) || 1) * 100;

  logger.info('Driver performance overview retrieved', { driverId, period });
  return {
    driverId,
    totalRides,
    totalDistance: totalDistance.toFixed(2),
    averageRating: averageRating.toFixed(2),
    completionRate: completionRate.toFixed(2),
  };
}

module.exports = {
  acceptRide,
  getRideDetails,
  updateRideStatus,
  communicateWithPassenger,
  getAvailableRides,
  cancelRideAssignment,
  estimateRideFare,
  getDriverPerformanceOverview,
};