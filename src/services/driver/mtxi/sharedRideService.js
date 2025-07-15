'use strict';

const { Ride, Customer, Driver, Route, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const rideConstants = require('@constants/common/rideConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const axios = require('axios');

async function addPassengerToSharedRide(rideId, passengerId, driverId, auditService, notificationService, socketService, pointService) {
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

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'shared_ride_completion').action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
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

async function removePassengerFromSharedRide(rideId, passengerId, driverId, auditService, notificationService, socketService, pointService) {
  const ride = await Ride.findByPk(rideId);
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }
  if (ride.driverId !== driverId) {
    throw new AppError('Unauthorized driver', 403, rideConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const transaction = await sequelize.transaction();
  try {
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

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'shared_ride_completion').action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(null, 'shared_ride:passenger_removed', { rideId, passengerId, driverId });

    await transaction.commit();
    logger.info('Passenger removed from shared ride', { rideId, passengerId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Remove passenger failed: ${error.message}`, 500, rideConstants.ERROR_CODES.RIDE_FAILED);
  }
}

async function getSharedRideDetails(rideId, auditService, pointService) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'], through: { attributes: [] } },
      { model: Route, as: 'route' },
    ],
  });
  if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
    throw new AppError('Invalid shared ride', 404, rideConstants.ERROR_CODES.INVALID_RIDE);
  }

  await auditService.logAction({
    userId: 'system',
    role: 'driver',
    action: 'GET_SHARED_RIDE_DETAILS',
    details: { rideId },
    ipAddress: 'unknown',
  });

  await pointService.awardPoints({
    userId: 'system',
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'shared_ride_details_access').action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

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

async function optimizeSharedRideRoute(rideId, driverId, auditService, socketService, pointService) {
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
    distance: routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000,
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

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'OPTIMIZE_SHARED_RIDE_ROUTE',
      details: { rideId, distance: optimizedRoute.distance },
      ipAddress: 'unknown',
    });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'route_calculate').action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
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

module.exports = {
  addPassengerToSharedRide,
  removePassengerFromSharedRide,
  getSharedRideDetails,
  optimizeSharedRideRoute,
};