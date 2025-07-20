'use strict';

const { Driver, Route, RouteOptimization, Vehicle, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const routeOptimizationConstants = require('@constants/driver/routeOptimizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function calculateOptimalRoute(origin, destination, driverId) {
  if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) {
    throw new AppError('Missing origin or destination coordinates', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const distance = calculateDistance(origin, destination);
  const duration = calculateEstimatedTime(origin, destination);
  const transaction = await sequelize.transaction();
  try {
    const route = await Route.create({
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
    }, { transaction });

    await RouteOptimization.create({
      totalDistance: distance,
      totalDuration: duration,
      driverLocation: driver.current_location,
      deliveryIds: [],
    }, { transaction });

    await driver.update({ active_route_id: route.id }, { transaction });

    await transaction.commit();
    logger.info('Optimal route calculated', { origin, destination, driverId });
    return {
      routeId: route.id,
      origin,
      destination,
      distance,
      duration,
      vehicle: driver.vehicles?.[0]?.type || null,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route calculation failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function updateRoute(driverId, routeId, newWaypoints) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: Route, as: 'activeRoute' }] });
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

    await RouteOptimization.update(
      { totalDistance: updates.distance || route.distance, totalDuration: updates.duration || route.duration },
      { where: { id: route.id }, transaction }
    );

    await transaction.commit();
    logger.info('Route updated', { driverId, routeId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update route failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getRouteDetails(routeId) {
  const route = await Route.findByPk(routeId, {
    include: [
      { model: sequelize.models.Order, as: 'orders', attributes: ['id', 'status'] },
      { model: sequelize.models.Ride, as: 'ride', attributes: ['id', 'status'] },
    ],
  });
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const optimization = await RouteOptimization.findOne({ where: { id: route.id } });

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
    optimization: optimization ? { totalDistance: optimization.totalDistance, totalDuration: optimization.totalDuration } : null,
  };
}

async function optimizeRouteForDriver(driverId, routeId) {
  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Vehicle, as: 'vehicles' },
      { model: DriverAvailability, as: 'availability' },
      { model: Route, as: 'activeRoute' },
    ],
  });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const route = await Route.findByPk(routeId);
  if (!route) throw new AppError('Route not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  if (driver.active_route_id !== routeId) {
    throw new AppError('Route not assigned to driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  const vehicle = driver.vehicles.find(v => v.id === driver.vehicle_info?.id);
  if (!vehicle || vehicle.status !== 'active') {
    throw new AppError('No active vehicle assigned', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_STATUS);
  }

  const activeAvailability = driver.availability.find(a => a.status === 'available' && a.isOnline);
  if (!activeAvailability) {
    throw new AppError('Driver not available', 400, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const distance = calculateDistance(route.origin, route.destination);
    const duration = calculateEstimatedTime(route.origin, route.destination);
    const capacityFactor = vehicle.capacity / vehicleConstants.VEHICLE_SETTINGS.MAX_CARGO_CAPACITY_KG;
    const optimizedOrder = route.waypoints ? [...route.waypoints].sort(() => capacityFactor * Math.random()) : [];

    await RouteOptimization.create({
      totalDistance: distance,
      totalDuration: duration,
      optimizedOrder,
      driverLocation: driver.current_location,
      deliveryIds: route.orders?.map(o => o.id) || [],
    }, { transaction });

    await route.update({ waypoints: optimizedOrder, distance, duration }, { transaction });

    await transaction.commit();
    logger.info('Route optimized', { driverId, routeId });
    return { routeId, optimizedOrder, distance, duration };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route optimization failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
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
  optimizeRouteForDriver,
};