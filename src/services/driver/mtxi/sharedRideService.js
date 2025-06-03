'use strict';

/**
 * Driver Shared Ride Service
 * Manages driver-side shared ride operations, including adding/removing passengers, retrieving details,
 * optimizing routes, and awarding gamification points. Integrates with common services.
 */

const { Ride, Customer, Driver, Route, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driver/driverConstants');
const rideConstants = require('@constants/common/rideConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const axios = require('axios');

/**
 * Adds a passenger to a shared ride.
 * @param {number} rideId - Ride ID.
 * @param {number} passengerId - Customer ID.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Updated ride object.
 */
async function addPassengerToSharedRide(rideId, passengerId, driverId) {
  const ride = await Ride.findByPk(rideId, {
    include: [{ model: Customer, as: 'customer', through: { attributes: [] } }],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const customer = await Customer.findByPk(passengerId);
  if (!customer) throw new AppError('Customer not found', 404, rideConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    // Simulate adding passenger (no direct many-to-many support in provided models)
    // Assuming a junction table or custom logic for shared ride passengers
    await sequelize.models.RideCustomer.create(
      { rideId, customerId: passengerId },
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'ADD_PASSENGER_SHARED_RIDE',
      details: { rideId, passengerId },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      message: formatMessage(
        'customer',
        'ride',
        rideConstants.RIDE_SETTINGS.DEFAULT_LANGUAGE,
        'ride.passenger_added',
        { rideId }
      ),
      priority: 'MEDIUM',
    });

    socketService.emit(null, 'shared_ride:passenger_added', { rideId, passengerId, driverId });

    await transaction.commit();
    logger.info('Passenger added to shared ride', { rideId, passengerId });
    return ride;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Add passenger failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

/**
 * Removes a passenger from a shared ride.
 * @param {number} rideId - Ride ID.
 * @param {number} passengerId - Customer ID.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<void>}
 */
async function removePassengerFromSharedRide(rideId, passengerId, driverId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const transaction = await sequelize.transaction();
  try {
    // Simulate removing passenger
    const deleted = await sequelize.models.RideCustomer.destroy({
      where: { rideId, customerId: passengerId },
      transaction,
    });
    if (!deleted) {
      throw new AppError('Passenger not in ride', 400, rideConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'REMOVE_PASSENGER_SHARED_RIDE',
      details: { rideId, passengerId },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: passengerId,
      notificationType: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      message: formatMessage(
        'customer',
        'ride',
        rideConstants.RIDE_SETTINGS.DEFAULT_LANGUAGE,
        'ride.passenger_removed',
        { rideId }
      ),
      priority: 'MEDIUM',
    });

    socketService.emit(null, 'shared_ride:passenger_removed', { rideId, passengerId, driverId });

    await transaction.commit();
    logger.info('Passenger removed from shared ride', { rideId, passengerId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Remove passenger failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

/**
 * Retrieves shared ride details.
 * @param {number} rideId - Ride ID.
 * @returns {Promise<Object>} Shared ride details.
 */
async function getSharedRideDetails(rideId) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'], through: { attributes: [] } },
      { model: Route, as: 'route' },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }

  logger.info('Shared ride details retrieved', { rideId });
  return {
    rideId: ride.id,
    passengers: ride.customer,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    route: ride.route,
    status: ride.status,
  };
}

/**
 * Calculates optimal route for shared ride.
 * @param {number} rideId - Ride ID.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Optimized route.
 */
async function optimizeSharedRideRoute(rideId, driverId) {
  const ride = await Ride.findByPk(rideId, {
    include: [{ model: Customer, as: 'customer', through: { attributes: [] } }, { model: Route, as: 'route' }],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const waypoints = ride.customer.map((p) => p.last_known_location || ride.pickupLocation);
  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: ride.pickupLocation.coordinates,
      destination: ride.dropoffLocation.coordinates,
      waypoints: waypoints.join('|'),
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  if (response.data.status !== 'OK') {
    throw new AppError('Route optimization failed', 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }

  const routeData = response.data.routes[0];
  const optimizedRoute = {
    distance: routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000, // in km
    duration: routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60, // in minutes
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

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'OPTIMIZE_SHARED_RIDE_ROUTE',
      details: { rideId, distance: optimizedRoute.distance },
      ipAddress: 'unknown',
    });

    socketService.emit(null, 'shared_ride:route_updated', { rideId, route: optimizedRoute });

    await transaction.commit();
    logger.info('Shared ride route optimized', { rideId, distance: optimizedRoute.distance });
    return optimizedRoute;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route optimization failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

/**
 * Awards gamification points for shared ride completion.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardSharedRidePoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const completedSharedRides = await Ride.count({
    where: {
      driverId,
      rideType: rideConstants.RIDE_TYPES.SHARED,
      status: rideConstants.RIDE_STATUSES.COMPLETED,
      updated_at: { [Op.gte]: sequelize.literal('CURRENT_DATE') },
    },
  });
  if (completedSharedRides === 0) {
    throw new AppError('No completed shared rides today', 400, rideConstants.ERROR_CODES.NO_COMPLETED_RIDES);
  }

  const pointsRecord = await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.SHARED_RIDE_COMPLETION.action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Shared ride points awarded', { driverId, points: pointsRecord.points });
  return pointsRecord;
}

module.exports = {
  addPassengerToSharedRide,
  removePassengerFromSharedRide,
  getSharedRideDetails,
  optimizeSharedRideRoute,
  awardSharedRidePoints,
};