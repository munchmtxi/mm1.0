'use strict';

const { Driver, Route, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const routeOptimizationConstants = require('@constants/driver/routeOptimizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function calculateOptimalRoute(origin, destination, pointService) {
  if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) {
    throw new AppError('Missing origin or destination coordinates', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const distance = calculateDistance(origin, destination);
  const duration = calculateEstimatedTime(origin, destination);
  const routeDetails = {
    origin,
    destination,
    waypoints: [],
    distance,
    duration,
    polyline: 'encoded_polyline_string',
    steps: [
      { instruction: 'Start at origin', distance: 0, duration: 0 },
      { instruction: `Head to destination (${destination.lat}, ${destination.lng})`, distance, duration },
    ],
    trafficModel: 'best_guess',
    fuel_efficiency_score: routeOptimizationConstants.ROUTE_OPTIMIZATION.FUEL_EFFICIENCY_WEIGHT * 100,
    time_efficiency_score: routeOptimizationConstants.ROUTE_OPTIMIZATION.TIME_EFFICIENCY_WEIGHT * 100,
  };

  await pointService.awardPoints({
    userId: 'system', // System-initiated action
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'route_calculate').action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Optimal route calculated', { origin, destination });
  return routeDetails;
}

async function updateRoute(driverId, routeId, newWaypoints, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const route = await Route.findByPk(routeId);
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  if (driver.active_route_id !== routeId) {
    throw new AppError('Route not assigned to driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  if (newWaypoints && newWaypoints.length > driverConstants.LOCATION_CONSTANTS.MAP_SETTINGS.MAX_WAYPOINTS_PER_ROUTE) {
    throw new AppError(
      `Cannot exceed ${driverConstants.LOCATION_CONSTANTS.MAP_SETTINGS.MAX_WAYPOINTS_PER_ROUTE} waypoints`,
      400,
      driverConstants.ERROR_CODES.INVALID_DRIVER
    );
  }

  const transaction = await sequelize.transaction();
  try {
    const updates = { updated_at: new Date() };
    if (newWaypoints) {
      updates.waypoints = newWaypoints;
      updates.distance = calculateDistance(route.origin, route.destination);
      updates.duration = calculateEstimatedTime(route.origin, route.destination);
    }

    await route.update(updates, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: routeOptimizationConstants.AUDIT_TYPES.UPDATE_ROUTE,
      details: { driverId, routeId, newWaypoints },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: routeOptimizationConstants.NOTIFICATION_TYPES.ROUTE_UPDATED,
      message: formatMessage(
        'driver',
        'route',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'route.updated',
        { routeId }
      ),
      priority: 'MEDIUM',
    });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'route_update').action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(null, routeOptimizationConstants.EVENT_TYPES.ROUTE_UPDATED, { driverId, routeId, newWaypoints });

    await transaction.commit();
    logger.info('Route updated', { driverId, routeId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update route failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getRouteDetails(routeId, auditService, pointService) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: sequelize.models.Order, as: 'orders', attributes: ['id', 'status'] },
      { model: sequelize.models.Ride, as: 'ride', attributes: ['id', 'status'] },
    ],
  });
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  await auditService.logAction({
    userId: 'system',
    role: 'driver',
    action: routeOptimizationConstants.AUDIT_TYPES.GET_ROUTE_DETAILS,
    details: { routeId },
    ipAddress: 'unknown',
  });

  await pointService.awardPoints({
    userId: 'system',
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'route_details_access').action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Route details retrieved', { routeId });
  return {
    routeId: route.id,
    origin: route.origin,
    destination: route.destination,
    waypoints: route.waypoints || [],
    distance: route.distance,
    duration: route.duration,
    polyline: route.polyline,
    steps: route.steps,
    trafficModel: route.trafficModel,
    rideId: route.rideId,
    orders: route.orders ? route.orders.map(o => ({ id: o.id, status: o.status })) : [],
    created_at: route.created_at,
    updated_at: route.updated_at,
  };
}

function calculateDistance(start, end) {
  const R = 6371;
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLng = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateEstimatedTime(start, end) {
  const distance = calculateDistance(start, end);
  const averageSpeedKmh = routeOptimizationConstants.ROUTE_OPTIMIZATION.AVERAGE_SPEED_KMH;
  return (distance / averageSpeedKmh) * 60;
}

module.exports = {
  calculateOptimalRoute,
  updateRoute,
  getRouteDetails,
};