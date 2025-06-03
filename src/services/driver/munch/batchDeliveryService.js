'use strict';

/**
 * Driver Batch Delivery Service
 * Manages driver-side batch food delivery operations, including creating batches, retrieving details,
 * updating status, optimizing routes, and awarding gamification points. Integrates with common services.
 */

const { Order, Customer, Driver, Route, RouteOptimization, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const munchConstants = require('@constants/munchConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const axios = require('axios');
const { Op } = require('sequelize');

/**
 * Groups deliveries into a batch.
 * @param {Array<number>} deliveryIds - Array of Order IDs to batch.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Created RouteOptimization object.
 */
async function createBatchDelivery(deliveryIds, driverId) {
  if (deliveryIds.length > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT) {
    throw new AppError('Batch limit exceeded', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver || driver.availability_status !== 'available') {
    throw new AppError('Driver unavailable', 400, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const orders = await Order.findAll({
    where: { id: deliveryIds, status: munchConstants.ORDER_STATUSES.READY, driver_id: null },
  });
  if (orders.length !== deliveryIds.length) {
    throw new AppError('Invalid or assigned deliveries', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const routeOptimization = await RouteOptimization.create(
      {
        totalDistance: 0,
        totalDuration: 0,
        deliveryIds,
        driverLocation: driver.current_location,
        created_at: new Date(),
      },
      { transaction }
    );

    await Order.update(
      { driver_id: driverId, status: munchConstants.ORDER_STATUSES.OUT_FOR_DELIVERY },
      { where: { id: deliveryIds }, transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'CREATE_BATCH_DELIVERY',
      details: { batchId: routeOptimization.id, deliveryIds },
      ipAddress: 'unknown',
    });

    for (const order of orders) {
      await notificationService.sendNotification({
        userId: order.customer_id,
        notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
        message: formatMessage(
          'customer',
          'delivery',
          munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
          'delivery.batch_assigned',
          { deliveryId: order.id, batchId: routeOptimization.id }
        ),
        priority: 'HIGH',
      });
    }

    socketService.emit(null, 'batch_delivery:created', { batchId: routeOptimization.id, deliveryIds, driverId });

    await transaction.commit();
    logger.info('Batch delivery created', { batchId: routeOptimization.id, driverId });
    return routeOptimization;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Create batch delivery failed: ${error.message}`, 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Retrieves batch delivery details.
 * @param {number} batchId - RouteOptimization ID representing the batch.
 * @returns {Promise<Object>} Batch delivery details.
 */
async function getBatchDeliveryDetails(batchId) {
  const routeOptimization = await RouteOptimization.findByPk(batchId, {
    include: [
      {
        model: Order,
        as: 'orders',
        include: [{ model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'] }],
      },
      { model: Route, as: 'route' },
    ],
  });
  if (!routeOptimization) throw new AppError('Batch delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

  logger.info('Batch delivery details retrieved', { batchId });
  return {
    batchId: routeOptimization.id,
    deliveryIds: routeOptimization.deliveryIds,
    orders: routeOptimization.orders.map((order) => ({
      deliveryId: order.id,
      customer: order.customer,
      deliveryLocation: order.delivery_location,
      status: order.status,
    })),
    totalDistance: routeOptimization.totalDistance,
    totalDuration: routeOptimization.totalDuration,
    route: routeOptimization.route,
  };
}

/**
 * Updates batch delivery progress.
 * @param {number} batchId - RouteOptimization ID representing the batch.
 * @param {string} status - New status for all deliveries in the batch.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<void>}
 */
async function updateBatchDeliveryStatus(batchId, status, driverId) {
  const validStatuses = Object.values(munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES);
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const routeOptimization = await RouteOptimization.findByPk(batchId);
  if (!routeOptimization) throw new AppError('Batch delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

  const orders = await Order.findAll({
    where: { id: routeOptimization.deliveryIds, driver_id: driverId },
  });
  if (orders.length !== routeOptimization.deliveryIds.length) {
    throw new AppError('Unauthorized driver or invalid deliveries', 403, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const transaction = await sequelize.transaction();
  try {
    const updates = { status, updated_at: new Date() };
    if (status === munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.DELIVERED) {
      updates.actual_delivery_time = new Date();
    }
    await Order.update(updates, { where: { id: routeOptimization.deliveryIds }, transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_BATCH_DELIVERY_STATUS',
      details: { batchId, status, deliveryIds: routeOptimization.deliveryIds },
      ipAddress: 'unknown',
    });

    for (const order of orders) {
      await notificationService.sendNotification({
        userId: order.customer_id,
        notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DELIVERY_UPDATE,
        message: formatMessage(
          'customer',
          'delivery',
          munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
          'delivery.batch_status_updated',
          { deliveryId: order.id, status, batchId }
        ),
        priority: 'MEDIUM',
      });
    }

    socketService.emit(null, 'batch_delivery:status_updated', { batchId, status, driverId });

    await transaction.commit();
    logger.info('Batch delivery status updated', { batchId, status });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update batch delivery status failed: ${error.message}`, 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Calculates optimal route for batch delivery.
 * @param {number} batchId - RouteOptimization ID representing the batch.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Optimized route.
 */
async function optimizeBatchDeliveryRoute(batchId, driverId) {
  const routeOptimization = await RouteOptimization.findByPk(batchId, {
    include: [{ model: Order, as: 'orders' }],
  });
  if (!routeOptimization) throw new AppError('Batch delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

  const orders = await Order.findAll({
    where: { id: routeOptimization.deliveryIds, driver_id: driverId },
  });
  if (orders.length !== routeOptimization.deliveryIds.length) {
    throw new AppError('Unauthorized driver or invalid deliveries', 403, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }

  const waypoints = orders.map((order) => order.delivery_location || routeOptimization.driverLocation);
  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: routeOptimization.driverLocation.coordinates,
      destination: orders[orders.length - 1].delivery_location.coordinates,
      waypoints: waypoints.slice(0, -1).join('|'),
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  if (response.data.status !== 'OK') {
    throw new AppError('Route optimization failed', 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const routeData = response.data.routes[0];
  const optimizedRoute = {
    distance: routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000, // in km
    duration: routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60, // in minutes
    polyline: routeData.overview_polyline.points,
  };

  const transaction = await sequelize.transaction();
  try {
    await RouteOptimization.update(
      {
        totalDistance: optimizedRoute.distance,
        totalDuration: optimizedRoute.duration,
        polyline: optimizedRoute.polyline,
        updated_at: new Date(),
      },
      { where: { id: batchId }, transaction }
    );

    await Route.update(
      {
        distance: optimizedRoute.distance,
        duration: optimizedRoute.duration,
        polyline: optimizedRoute.polyline,
        updated_at: new Date(),
      },
      { where: { id: orders[0].route_id }, transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'OPTIMIZE_BATCH_DELIVERY_ROUTE',
      details: { batchId, distance: optimizedRoute.distance },
      ipAddress: 'unknown',
    });

    socketService.emit(null, 'batch_delivery:route_updated', { batchId, route: optimizedRoute });

    await transaction.commit();
    logger.info('Batch delivery route optimized', { batchId, distance: optimizedRoute.distance });
    return optimizedRoute;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Route optimization failed: ${error.message}`, 500, munchConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Awards gamification points for batch delivery completion.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardBatchDeliveryPoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

  const completedBatchDeliveries = await RouteOptimization.count({
    include: [
      {
        model: Order,
        as: 'orders',
        where: {
          driver_id: driverId,
          status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.DELIVERED,
          updated_at: { [Op.gte]: sequelize.literal('CURRENT_DATE') },
        },
      },
    ],
  });
  if (completedBatchDeliveries === 0) {
    throw new AppError('No completed batch deliveries today', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }

  const pointsRecord = await pointService.awardPoints({
    userId: driver.user_id,
    role: 'driver',
    action: munchConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.BATCH_DELIVERY.action,
    languageCode: munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
  });

  logger.info('Batch delivery points awarded', { driverId, points: pointsRecord.points });
  return pointsRecord;
}

module.exports = {
  createBatchDelivery,
  getBatchDeliveryDetails,
  updateBatchDeliveryStatus,
  optimizeBatchDeliveryRoute,
  awardBatchDeliveryPoints,
};