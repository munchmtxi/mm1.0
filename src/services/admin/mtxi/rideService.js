'use strict';

const { Ride, Route, RideCustomer, Driver } = require('@models');
const rideConstants = require('@constants/common/rideConstants');
const driverConstants = require('@constants/common/driverConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');

async function monitorRides(rideId, { notificationService, socketService, auditService }) {
  try {
    if (!rideId) {
      throw new AppError('ride_id required', 400, rideConstants.ERROR_CODES.INVALID_RIDE);
    }

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: Route, as: 'route', attributes: ['distance', 'duration', 'origin', 'destination'] },
        { model: Driver, as: 'driver', attributes: ['id', 'current_location'] },
      ],
    });
    if (!ride) {
      throw new AppError('ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
    }

    const progress = {
      rideId,
      status: ride.status,
      currentLocation: ride.driver?.current_location || null,
      distanceCovered: ride.route?.distance || 0,
      estimatedTimeRemaining: ride.route?.duration || 0,
    };

    await notificationService.sendNotification({
      userId: ride.driver?.user_id.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      messageKey: 'ride.progress_updated',
      messageParams: { rideId, status: ride.status },
      role: 'driver',
      module: 'mtxi',
    });

    await socketService.emit(null, 'ride:progress_updated', {
      rideId,
      status: ride.status,
      currentLocation: progress.currentLocation,
    });

    await auditService.logAction({
      userId: ride.driver?.user_id.toString(),
      action: rideConstants.ANALYTICS_CONSTANTS.METRICS.ROUTE_EFFICIENCY,
      details: { rideId, status: ride.status },
      ipAddress: 'unknown',
    });

    logger.info('Ride progress monitored', { rideId, status: ride.status });
    return progress;
  } catch (error) {
    logger.logErrorEvent(`monitorRides failed: ${error.message}`, { rideId });
    throw error;
  }
}

async function manageSharedRides(rideId, coordination, { notificationService, socketService, auditService }) {
  try {
    if (!rideId || !coordination?.customerIds?.length || !coordination?.stops?.length) {
      throw new AppError('invalid ride_id or coordination details', 400, rideConstants.ERROR_CODES.INVALID_RIDE);
    }

    const ride = await Ride.findByPk(rideId, {
      include: [{ model: Route, as: 'route' }],
    });
    if (!ride || ride.rideType !== rideConstants.RIDE_TYPES.SHARED) {
      throw new AppError('ride not found or not shared', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
    }

    if (coordination.customerIds.length > rideConstants.SHARED_RIDE_COUNT.MAX_PERSONS || coordination.stops.length > rideConstants.SHARED_RIDE_COUNT.MAX_STOPS) {
      throw new AppError('exceeds shared ride limits', 400, rideConstants.ERROR_CODES.RIDE_BOOKING_FAILED);
    }

    await RideCustomer.destroy({ where: { rideId } });
    await RideCustomer.bulkCreate(coordination.customerIds.map(customerId => ({
      rideId,
      customerId,
    })));

    await ride.route.update({
      stops: coordination.stops,
    });

    const sharedRideDetails = {
      rideId,
      customerCount: coordination.customerIds.length,
      stops: coordination.stops,
      updatedAt: new Date(),
    };

    await notificationService.sendNotification({
      userId: ride.driverId?.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      messageKey: 'ride.shared_updated',
      messageParams: { rideId, customerCount: sharedRideDetails.customerCount },
      role: 'driver',
      module: 'mtxi',
    });

    await socketService.emit(null, 'ride:shared_updated', {
      rideId,
      customerCount: sharedRideDetails.customerCount,
      stops: sharedRideDetails.stops,
    });

    await auditService.logAction({
      userId: ride.driverId?.toString(),
      action: rideConstants.ANALYTICS_CONSTANTS.METRICS.ROUTE_EFFICIENCY,
      details: { rideId, customerCount: sharedRideDetails.customerCount },
      ipAddress: 'unknown',
    });

    logger.info('Shared ride coordinated', { rideId, customerCount: sharedRideDetails.customerCount });
    return sharedRideDetails;
  } catch (error) {
    logger.logErrorEvent(`manageSharedRides failed: ${error.message}`, { rideId, coordination });
    throw error;
  }
}

async function awardRidePoints(driverId, { notificationService, socketService, auditService, pointService }) {
  try {
    if (!driverId) {
      throw new AppError('driver_id required', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const completedRides = await Ride.count({
      where: { driverId, status: rideConstants.RIDE_STATUSES.COMPLETED },
    });

    if (!completedRides) {
      throw new AppError('no completed rides', 404, rideConstants.ERROR_CODES.NO_COMPLETED_RIDES);
    }

    const points = completedRides * driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.RIDE_COMPLETION.points;
    await pointService.awardPoints({
      userId: driver.user_id.toString(),
      points,
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.RIDE_COMPLETION.action,
      module: 'mtxi',
      details: { driverId, completedRides },
    });

    const pointsDetails = {
      driverId,
      pointsAwarded: points,
      totalRides: completedRides,
    };

    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'ride.points_awarded',
      messageParams: { driverId, points },
      role: 'driver',
      module: 'mtxi',
    });

    await socketService.emit(null, 'ride:points_awarded', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      points,
    });

    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.RIDE_COMPLETION.action,
      details: { driverId, points },
      ipAddress: 'unknown',
    });

    logger.info('Ride points awarded', { driverId, points });
    return pointsDetails;
  } catch (error) {
    logger.logErrorEvent(`awardRidePoints failed: ${error.message}`, { driverId });
    throw error;
  }
}

async function optimizeRouting(rideId, { notificationService, socketService, auditService, locationService }) {
  try {
    if (!rideId) {
      throw new AppError('ride_id required', 400, rideConstants.ERROR_CODES.INVALID_RIDE);
    }

    const ride = await Ride.findByPk(rideId, {
      include: [{ model: Route, as: 'route' }],
    });
    if (!ride) {
      throw new AppError('ride not found', 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
    }

    const optimizedRoute = await locationService.optimizeRoute({
      origin: ride.route.origin,
      destination: ride.route.destination,
      waypoints: ride.route.stops || [],
      trafficModel: 'best_guess',
    });

    await ride.route.update({
      distance: optimizedRoute.distance,
      duration: optimizedRoute.duration,
      stops: optimizedRoute.waypoints,
      polyline: optimizedRoute.polyline,
      trafficModel: optimizedRoute.trafficModel,
    });

    const routeDetails = {
      rideId,
      distance: optimizedRoute.distance,
      duration: optimizedRoute.duration,
      waypoints: optimizedRoute.waypoints,
    };

    await notificationService.sendNotification({
      userId: ride.driverId?.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      messageKey: 'ride.route_optimized',
      messageParams: { rideId, duration: routeDetails.duration },
      role: 'driver',
      module: 'mtxi',
    });

    await socketService.emit(null, 'ride:route_optimized', {
      rideId,
      distance: routeDetails.distance,
      duration: routeDetails.duration,
    });

    await auditService.logAction({
      userId: ride.driverId?.toString(),
      action: rideConstants.ANALYTICS_CONSTANTS.METRICS.ROUTE_EFFICIENCY,
      details: { rideId, distance: routeDetails.distance },
      ipAddress: 'unknown',
    });

    logger.info('Route optimized', { rideId, distance: routeDetails.distance });
    return routeDetails;
  } catch (error) {
    logger.logErrorEvent(`optimizeRouting failed: ${error.message}`, { rideId });
    throw error;
  }
}

module.exports = {
  monitorRides,
  manageSharedRides,
  awardRidePoints,
  optimizeRouting,
};