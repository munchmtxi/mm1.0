'use strict';

const { Ride, Customer, Driver, Route, RouteOptimization, Vehicle, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/mtxiConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const routeOptimizationConstants = require('@constants/driver/routeOptimizationConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const axios = require('axios');

async function addPassengerToSharedRide(rideId, passengerId, driverId) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', through: { attributes: [] } },
      { model: Driver, as: 'driver', include: [{ model: Vehicle, as: 'vehicles' }] },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }
  if (ride.customer.length >= rideConstants.SHARED_RIDE_CONFIG.MAX_PASSENGERS) {
    throw new AppError('Shared ride at capacity', 400, rideConstants.ERROR_TYPES.INVALID_RIDE);
  }

  const customer = await Customer.findByPk(passengerId);
  if (!customer) throw new AppError('Customer not found', 404, driverConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);

  const vehicle = ride.driver.vehicles.find(v => v.capacity >= (ride.customer.length + 1) && v.status === vehicleConstants.VEHICLE_STATUSES.active);
  if (!vehicle) {
    throw new AppError('Vehicle capacity exceeded', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const transaction = await sequelize.transaction();
  try {
    await sequelize.models.RideCustomer.create(
      { rideId, customerId: passengerId },
      { transaction }
    );
    await transaction.commit();
    logger.info('Passenger added to shared ride', { rideId, passengerId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Add passenger failed: ${error.message}`, 500, rideConstants.ERROR_TYPES.RIDE_CREATION_FAILED);
  }
}

async function removePassengerFromSharedRide(rideId, passengerId, driverId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  const transaction = await sequelize.transaction();
  try {
    const deleted = await sequelize.models.RideCustomer.destroy({
      where: { rideId, customerId: passengerId },
      transaction,
    });
    if (!deleted) {
      throw new AppError('Passenger not in ride', 400, driverConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }
    await transaction.commit();
    logger.info('Passenger removed from shared ride', { rideId, passengerId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Remove passenger failed: ${error.message}`, 500, rideConstants.ERROR_TYPES.RIDE_CANCELLATION_FAILED);
  }
}

async function getSharedRideDetails(rideId, countryCode = localizationConstants.DEFAULT_COUNTRY) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number', 'country'], through: { attributes: [] } },
      { model: Route, as: 'route' },
      { model: Driver, as: 'driver', attributes: ['name', 'phone_number', 'rating'] },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }

  const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;
  logger.info('Shared ride details retrieved', { rideId });
  return {
    rideId: ride.id,
    passengers: ride.customer.map(c => ({ ...c.toJSON(), currency })),
    driver: ride.driver,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    route: ride.route,
    status: ride.status,
  };
}

async function optimizeSharedRideRoute(rideId, driverId) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', through: { attributes: [] } },
      { model: Route, as: 'route' },
      { model: RouteOptimization, as: 'routeOptimization' },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }
  if (ride.customer.length > rideConstants.SHARED_RIDE_CONFIG.MAX_PASSENGERS) {
    throw new AppError('Too many passengers for optimization', 400, rideConstants.ERROR_TYPES.INVALID_RIDE);
  }

  const waypoints = ride.customer.map(p => p.last_known_location || ride.pickupLocation).slice(0, routeOptimizationConstants.ROUTE_OPTIMIZATION.MAX_WAYPOINTS);
  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: ride.pickupLocation.coordinates,
      destination: ride.dropoffLocation.coordinates,
      waypoints: waypoints.join('|'),
      key: process.env.GOOGLE_MAPS_API_KEY,
      traffic_model: routeOptimizationConstants.TRAFFIC_MODELS[0], // best_guess
    },
  });

  if (response.data.status !== 'OK') {
    throw new AppError('Route optimization failed', 500, routeOptimizationConstants.ERROR_CODES.ROUTE_OPERATION_FAILED);
  }

  const routeData = response.data.routes[0];
  const totalDistance = routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
  if (totalDistance > rideConstants.RIDE_CONFIG.MAX_RANGE_KM * (1 + routeOptimizationConstants.ROUTE_OPTIMIZATION.MAX_DEVIATION_PERCENTAGE / 100)) {
    throw new AppError('Route deviation exceeded', 400, routeOptimizationConstants.ERROR_CODES.ROUTE_OPERATION_FAILED);
  }

  const optimizedRoute = {
    distance: totalDistance,
    duration: routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60,
    polyline: routeData.overview_polyline.points,
  };

  const transaction = await sequelize.transaction();
  try {
    await Route.update(
      {
        distance: optimizedRoute.distance,
        duration: optimizedRoute.duration,
        polyline: optimizedRoute.polyline,
        updated_at: new Date(),
      },
      { where: { rideId }, transaction }
    );

    await RouteOptimization.update(
      {
        totalDistance: optimizedRoute.distance,
        totalDuration: optimizedRoute.duration,
        polyline: optimizedRoute.polyline,
        updated_at: new Date(),
      },
      { where: { id: ride.routeOptimizationId }, transaction }
    );

    await transaction.commit();
    logger.info('Shared ride route optimized', { rideId, distance: optimizedRoute.distance });
    return optimizedRoute;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route optimization failed: ${error.message}`, 500, routeOptimizationConstants.ERROR_CODES.ROUTE_OPERATION_FAILED);
  }
}

async function estimateSharedRideFare(rideId, driverId, countryCode = localizationConstants.DEFAULT_COUNTRY) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', through: { attributes: [] } },
      { model: Route, as: 'route' },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  const baseFare = rideConstants.RIDE_TYPES.SHARED.baseFare;
  const perKmRate = rideConstants.RIDE_CONFIG.DYNAMIC_PRICING.surgeMultiplierMax > 1 ? 1.5 : 1.2; // Example surge logic
  const perPassengerRate = rideConstants.SHARED_RIDE_CONFIG.MAX_PASSENGERS > 2 ? 2.0 : 1.5;
  const distance = ride.route?.distance || 10; // Default to 10km
  const passengerCount = ride.customer.length || 1;
  const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;

  const estimatedFare = baseFare + (distance * perKmRate) + (passengerCount * perPassengerRate);
  logger.info('Shared ride fare estimated', { rideId, estimatedFare });
  return { rideId, estimatedFare, currency, passengerCount, distance };
}

async function getDriverSharedRideMetrics(driverId, period = driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.monthly) {
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
      rideType: rideConstants.RIDE_TYPES.SHARED.name,
      status: rideConstants.RIDE_STATUSES.COMPLETED,
      created_at: dateRange,
    },
    include: [
      { model: Customer, as: 'customer', through: { attributes: [] } },
      { model: DriverRatings, as: 'rating' },
    ],
  });

  const totalRides = rides.length;
  const totalPassengers = rides.reduce((sum, ride) => sum + (ride.customer.length || 1), 0);
  const averageRating = rides.reduce((sum, ride) => sum + (ride.rating?.rating || 0), 0) / (rides.length || 1);
  const totalDistance = rides.reduce((sum, ride) => sum + (ride.route?.distance || 0), 0);

  logger.info('Driver shared ride metrics retrieved', { driverId, totalRides, totalPassengers });
  return {
    driverId,
    totalRides,
    totalPassengers,
    totalDistance: totalDistance.toFixed(2),
    averageRating: averageRating.toFixed(2),
  };
}

// New function: Suggest eco-friendly route
async function suggestEcoRoute(rideId, driverId) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', through: { attributes: [] } },
      { model: Route, as: 'route' },
      { model: Driver, as: 'driver', include: [{ model: Vehicle, as: 'vehicles' }] },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED.name) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_TYPES.INVALID_RIDE_REQUEST);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_TYPES.PERMISSION_DENIED);
  }

  const vehicle = ride.driver.vehicles.find(v => v.status === vehicleConstants.VEHICLE_STATUSES.active);
  const fuelType = vehicle?.fuel_type || vehicleConstants.VEHICLE_SETTINGS.FUEL_TYPES[0];
  const isEcoFriendly = [vehicleConstants.VEHICLE_SETTINGS.FUEL_TYPES.electric, vehicleConstants.VEHICLE_SETTINGS.FUEL_TYPES.hybrid].includes(fuelType);

  const waypoints = ride.customer.map(p => p.last_known_location || ride.pickupLocation).slice(0, routeOptimizationConstants.ROUTE_OPTIMIZATION.MAX_WAYPOINTS);
  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: ride.pickupLocation.coordinates,
      destination: ride.dropoffLocation.coordinates,
      waypoints: waypoints.join('|'),
      key: process.env.GOOGLE_MAPS_API_KEY,
      traffic_model: routeOptimizationConstants.AI_OPTIMIZATION_MODELS.eco_friendly,
    },
  });

  if (response.data.status !== 'OK') {
    throw new AppError('Eco route suggestion failed', 500, routeOptimizationConstants.ERROR_CODES.ROUTE_OPERATION_FAILED);
  }

  const routeData = response.data.routes[0];
  const ecoRoute = {
    distance: routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000,
    duration: routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60,
    polyline: routeData.overview_polyline.points,
    environmentalImpact: isEcoFriendly ? 'low' : 'moderate',
  };

  logger.info('Eco route suggested', { rideId, distance: ecoRoute.distance });
  return ecoRoute;
}

// New function: Check vehicle maintenance status
async function checkVehicleMaintenance(driverId) {
  const driver = await Driver.findByPk(driverId, {
    include: [{ model: Vehicle, as: 'vehicles' }],
  });
  if (!driver) throw new AppError('Driver not found', 400, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const maintenanceStatus = await Promise.all(driver.vehicles.map(async vehicle => {
    const lastMaintenance = new Date(vehicle.updated_at);
    const daysSinceMaintenance = (new Date() - lastMaintenance) / (1000 * 60 * 60 * 24);
    const maintenanceDue = daysSinceMaintenance > vehicleConstants.MAINTENANCE_SETTINGS.MAINTENANCE_ALERT_FREQUENCY_DAYS;

    return {
      vehicleId: vehicle.id,
      type: vehicle.type,
      status: vehicle.status,
      maintenanceDue,
      lastMaintenance: lastMaintenance.toLocaleDateString(localizationConstants.DEFAULT_LANGUAGE, {
        timeZone: localizationConstants.DEFAULT_TIMEZONE,
      }),
    };
  }));

  logger.info('Vehicle maintenance status checked', { driverId });
  return maintenanceStatus;
}

module.exports = {
  addPassengerToSharedRide,
  removePassengerFromSharedRide,
  getSharedRideDetails,
  optimizeSharedRideRoute,
  estimateSharedRideFare,
  getDriverSharedRideMetrics,
  suggestEcoRoute,
  checkVehicleMaintenance,
};