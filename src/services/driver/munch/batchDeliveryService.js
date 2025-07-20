'use strict';

const { Order, Customer, Driver, Route, RouteOptimization, sequelize } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const driverConstants = require('@constants/driver/driverConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const axios = require('axios');

async function createBatchDelivery(deliveryIds, driverId) {
  try {
    if (deliveryIds.length > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT) {
      throw new AppError('Batch limit exceeded', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver || driver.availability_status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.available) {
      throw new AppError('Driver unavailable', 400, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const requiredCerts = driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS;
    if (!driver.certifications || !requiredCerts.every(cert => driver.certifications.includes(cert))) {
      throw new AppError('Missing required certifications', 400, driverConstants.ERROR_CODES.CERTIFICATION_EXPIRED);
    }

    const orders = await Order.findAll({
      where: { id: deliveryIds, status: munchConstants.ORDER_STATUSES.ready, driver_id: null },
      include: [{ model: Customer, as: 'customer' }],
    });
    if (orders.length !== deliveryIds.length) {
      throw new AppError('Invalid or assigned deliveries', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const hasLargeOrder = orders.some(order => order.items.some(item => item.size === 'large' || item.weight > 10));
    const hasFragileOrder = orders.some(order => order.items.some(item => item.is_fragile));
    const vehicleType = driver.vehicle_info.type;
    if (hasLargeOrder && !['van', 'truck'].includes(vehicleType)) {
      throw new AppError('Vehicle unsuitable for large order', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
    }
    if (hasFragileOrder && !driver.vehicle_info.has_secure_compartment) {
      throw new AppError('Vehicle lacks secure compartment for fragile items', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
    }

    const dietaryFilters = customerConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS;
    const invalidDietary = orders.some(order => order.items.some(item => item.dietary && !dietaryFilters.includes(item.dietary)));
    if (invalidDietary) {
      throw new AppError('Invalid dietary preferences', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
    }

    const transaction = await sequelize.transaction();
    try {
      const sealIds = deliveryIds.map(id => `SEAL-${id}-${Date.now()}`);
      for (let i = 0; i < orders.length; i++) {
        await orders[i].update(
          {
            status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.accepted,
            driver_id: driverId,
            tamper_seal_id: sealIds[i],
            updated_at: new Date(),
          },
          { transaction }
        );
      }

      const routeOptimization = await RouteOptimization.create(
        {
          driver_id: driverId,
          delivery_ids: deliveryIds,
          status: 'pending',
          created_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      logger.logApiEvent('Batch delivery created', { deliveryIds, driverId, routeOptimizationId: routeOptimization.id });
      return { deliveryIds, routeOptimizationId: routeOptimization.id, sealIds };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('createBatchDelivery', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('createBatchDelivery', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function optimizeBatchDeliveryRoute(routeOptimizationId, driverId) {
  try {
    const routeOptimization = await RouteOptimization.findByPk(routeOptimizationId, {
      include: [{ model: Order, as: 'orders', include: [{ model: Customer, as: 'customer' }] }],
    });
    if (!routeOptimization) {
      throw new AppError('Route optimization not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (routeOptimization.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    const orders = routeOptimization.orders;
    const deliveryLocations = orders.map(order => order.delivery_location);
    const country = orders[0]?.customer?.country || localizationConstants.SUPPORTED_COUNTRIES[0];
    const mapProvider = localizationConstants.SUPPORTED_MAP_PROVIDERS[country] || 'google_maps';

    const response = await axios.post(
      `https://api.${mapProvider}.com/route/optimize`,
      {
        locations: deliveryLocations,
        vehicle_type: (await Driver.findByPk(driverId)).vehicle_info.type,
        constraints: { max_distance_km: munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM },
      },
      { headers: { Authorization: `Bearer ${process.env.MAP_API_KEY}` } }
    );

    const optimizedRoute = response.data.route;
    const route = await Route.create({
      route_optimization_id: routeOptimizationId,
      path: optimizedRoute.path,
      estimated_duration: optimizedRoute.duration,
      created_at: new Date(),
    });

    await routeOptimization.update({ status: 'optimized', updated_at: new Date() });
    logger.logApiEvent('Batch delivery route optimized', { routeOptimizationId, driverId });
    return { routeId: route.id, path: route.path, estimatedDuration: route.estimated_duration };
  } catch (error) {
    throw handleServiceError('optimizeBatchDeliveryRoute', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function updateBatchDeliveryStatus(routeOptimizationId, status, driverId) {
  try {
    const validStatuses = munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES;
    if (!Object.values(validStatuses).includes(status)) {
      throw new AppError('Invalid status', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const routeOptimization = await RouteOptimization.findByPk(routeOptimizationId, {
      include: [{ model: Order, as: 'orders' }],
    });
    if (!routeOptimization) {
      throw new AppError('Route optimization not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (routeOptimization.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    if (status === validStatuses.delivered) {
      const unverifiedSeals = routeOptimization.orders.some(order => !order.tamper_seal_verified);
      if (unverifiedSeals) {
        throw new AppError('Tamper-proof seal verification required for all deliveries', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
      }
    }

    const transaction = await sequelize.transaction();
    try {
      for (const order of routeOptimization.orders) {
        const updates = { status, updated_at: new Date() };
        if (status === validStatuses.delivered) {
          updates.actual_delivery_time = new Date();
          updates.tamper_seal_verified = true;
        }
        await order.update(updates, { transaction });
      }

      await routeOptimization.update({ status, updated_at: new Date() }, { transaction });
      await transaction.commit();
      logger.logApiEvent('Batch delivery status updated', { routeOptimizationId, status });
      return { routeOptimizationId, status };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('updateBatchDeliveryStatus', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('updateBatchDeliveryStatus', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function getDriverBatchDeliveries(driverId) {
  try {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const routeOptimizations = await RouteOptimization.findAll({
      where: { driver_id: driverId },
      include: [{ model: Order, as: 'orders', include: [{ model: Customer, as: 'customer' }] }],
    });

    const deliveries = routeOptimizations.map(route => ({
      routeOptimizationId: route.id,
      deliveryIds: route.delivery_ids,
      status: route.status,
      orders: route.orders.map(order => ({
        deliveryId: order.id,
        customer: order.customer,
        deliveryLocation: order.delivery_location,
        isFragile: order.items.some(item => item.is_fragile),
        isLarge: order.items.some(item => item.size === 'large' || item.weight > 10),
        dietaryPreferences: order.items.map(item => item.dietary).filter(Boolean),
      })),
    }));

    logger.logApiEvent('Driver batch deliveries retrieved', { driverId, count: deliveries.length });
    return deliveries;
  } catch (error) {
    throw handleServiceError('getDriverBatchDeliveries', error, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }
}

async function verifyBatchTamperSeals(routeOptimizationId, driverId, sealIds) {
  try {
    const routeOptimization = await RouteOptimization.findByPk(routeOptimizationId, {
      include: [{ model: Order, as: 'orders' }],
    });
    if (!routeOptimization) {
      throw new AppError('Route optimization not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (routeOptimization.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    const orders = routeOptimization.orders;
    if (sealIds.length !== orders.length) {
      throw new AppError('Mismatch in number of seals provided', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const transaction = await sequelize.transaction();
    try {
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].tamper_seal_id !== sealIds[i]) {
          throw new AppError(`Invalid tamper-proof seal ID for delivery ${orders[i].id}`, 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
        }
        await orders[i].update({ tamper_seal_verified: true }, { transaction });
      }

      await transaction.commit();
      logger.logSecurityEvent('Batch tamper seals verified', { routeOptimizationId, driverId, sealIds });
      return { routeOptimizationId, verified: true };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('verifyBatchTamperSeals', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('verifyBatchTamperSeals', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

module.exports = {
  createBatchDelivery,
  optimizeBatchDeliveryRoute,
  updateBatchDeliveryStatus,
  getDriverBatchDeliveries,
  verifyBatchTamperSeals,
};