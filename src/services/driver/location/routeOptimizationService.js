'use strict';

/**
 * Driver Route Optimization Service
 * Manages route optimization operations, including calculating optimal routes,
 * updating routes, retrieving route details, and awarding gamification points.
 */

const { Driver, Route, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Calculates the optimal route between origin and destination.
 * @param {Object} origin - Origin coordinates { lat, lng }.
 * @param {Object} destination - Destination coordinates { lat, lng }.
 * @returns {Promise<Object>} Optimal route details.
 */
async function calculateOptimalRoute(origin, destination) {
  if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) {
    throw new AppError('Missing origin or destination coordinates', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  // Simulate external routing API call (e.g., Google Maps Directions API)
  const distance = calculateDistance(origin, destination); // In km
  const duration = calculateEstimatedTime(origin, destination); // In minutes
  const routeDetails = {
    origin,
    destination,
    waypoints: [], // Simplified; real API would return optimized waypoints
    distance, // In km
    duration, // In minutes
    polyline: 'encoded_polyline_string', // Placeholder
    steps: [
      { instruction: 'Start at origin', distance: 0, duration: 0 },
      { instruction: `Head to destination (${destination.lat}, ${destination.lng})`, distance, duration },
    ], // Simplified steps
    trafficModel: 'best_guess', // Default traffic model
    fuel_efficiency_score: driverConstants.LOCATION_CONSTANTS.ROUTE_OPTIMIZATION.FUEL_EFFICIENCY_WEIGHT * 100,
    time_efficiency_score: driverConstants.LOCATION_CONSTANTS.ROUTE_OPTIMIZATION.TIME_EFFICIENCY_WEIGHT * 100,
  };

  logger.info('Optimal route calculated', { origin, destination });
  return routeDetails;
}

/**
 * Updates an existing route with new waypoints.
 * @param {number} driverId - Driver ID.
 * @param {number} routeId - Route ID.
 * @param {Array<Object>} newWaypoints - Array of waypoints [{ lat, lng }].
 * @returns {Promise<void>}
 */
async function updateRoute(driverId, routeId, newWaypoints) {
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
      // Recalculate distance and duration (simplified)
      updates.distance = calculateDistance(route.origin, route.destination);
      updates.duration = calculateEstimatedTime(route.origin, route.destination);
    }

    await route.update(updates, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_ROUTE',
      details: { driverId, routeId, newWaypoints },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'route',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'route.updated',
        { routeId }
      ),
      priority: 'MEDIUM',
    });

    socketService.emit(null, 'route:updated', { driverId, routeId, newWaypoints });

    await transaction.commit();
    logger.info('Route updated', { driverId, routeId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update route failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

/**
 * Retrieves route details.
 * @param {number} routeId - Route ID.
 * @returns {Promise<Object>} Route details.
 */
async function getRouteDetails(routeId) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: sequelize.models.Order, as: 'orders', attributes: ['id', 'status'] },
      { model: sequelize.models.Ride, as: 'ride', attributes: ['id', 'status'] },
    ],
  });
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

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

/**
 * Awards gamification points for efficient route optimization.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardRoutePoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!driver.active_route_id) {
    throw new AppError('No active route found', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const route = await Route.findByPk(driver.active_route_id);
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const pointsRecord = await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.EFFICIENT_ROUTER.action,
    languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Route points awarded', { driverId, points: pointsRecord.points });
  return pointsRecord;
}

/**
 * Helper: Calculates approximate distance between two points (Haversine formula).
 * @param {Object} start - Start coordinates { lat, lng }.
 * @param {Object} end - End coordinates { lat, lng }.
 * @returns {number} Distance in kilometers.
 */
function calculateDistance(start, end) {
  const R = 6371; // Earth's radius in km
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLng = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Helper: Estimates travel time based on distance.
 * @param {Object} start - Start coordinates { lat, lng }.
 * @param {Object} end - End coordinates { lat, lng }.
 * @returns {number} Estimated time in minutes.
 */
function calculateEstimatedTime(start, end) {
  const distance = calculateDistance(start, end);
  const averageSpeedKmh = 40; // Assume average speed
  return (distance / averageSpeedKmh) * 60; // Time in minutes
}

module.exports = {
  calculateOptimalRoute,
  updateRoute,
  getRouteDetails,
  awardRoutePoints,
};