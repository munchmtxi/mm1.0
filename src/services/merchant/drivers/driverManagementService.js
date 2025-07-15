'use strict';

const { Op } = require('sequelize');
const {
  Driver,
  Order,
  Task,
  Vehicle,
  Route,
  DriverAvailability,
  DriverRatings,
  DeliveryHotspot,
  MerchantBranch,
} = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const routeConstants = require('@constants/driver/routeOptimizationConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const staffConstants = require('@constants/staff/staffConstants');
const locationService = require('@services/common/locationService');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function assignDeliveryTask(driverId, orderId, ipAddress, transaction = null) {
  try {
    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'status', 'merchant_id', 'preferred_language', 'current_location'],
      include: [
        { model: Vehicle, as: 'vehicles', attributes: ['id', 'type', 'capacity', 'status'] },
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: Merchant, as: 'merchant', attributes: ['business_type'] },
      ],
      transaction,
    });
    if (
      !driver ||
      driver.status !== driverConstants.DRIVER_STATUSES[0] || // available
      driver.availability?.status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0] // available
    ) {
      throw new AppError('Invalid delivery assignment', 404, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
    }

    if (!driver.vehicles?.length || !driver.vehicles.every((v) => vehicleConstants.VEHICLE_TYPES.includes(v.type))) {
      throw new AppError('Invalid vehicle type', 400, vehicleConstants.ERROR_CODES[0]); // INVALID_VEHICLE_TYPE
    }

    if (driver.vehicles?.length > vehicleConstants.VEHICLE_SETTINGS.MAX_VEHICLES_PER_DRIVER) {
      throw new AppError('Max vehicles exceeded', 400, vehicleConstants.ERROR_CODES[0]); // INVALID_VEHICLE_TYPE
    }

    if (driver.merchant_id && !staffConstants.STAFF_ROLES.driver.supportedMerchantTypes.includes(driver.merchant?.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const order = await Order.findByPk(orderId, {
      attributes: ['id', 'status', 'order_number', 'branch_id', 'route_id', 'estimated_delivery_time', 'delivery_location', 'currency'],
      include: [
        { model: Route, as: 'route', attributes: ['id', 'distance', 'duration', 'trafficModel'] },
        { model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'location', 'currency'] },
      ],
      transaction,
    });
    if (!order || !munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes(order.status)) {
      throw new AppError('Invalid order status', 400, munchConstants.ERROR_CODES[0]); // ORDER_NOT_FOUND
    }

    if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[3]) { // ready
      throw new AppError('Order not ready', 400, munchConstants.ERROR_CODES[0]); // ORDER_NOT_FOUND
    }

    if (!order.route_id || !order.route || !routeConstants.TRAFFIC_MODELS.includes(order.route.trafficModel)) {
      throw new AppError('Invalid route or traffic model', 400, routeConstants.ERROR_CODES[1]); // ROUTE_NOT_FOUND
    }

    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(order.currency)) {
      throw new AppError('Unsupported currency', 400, munchConstants.ERROR_CODES[11]); // PAYMENT_FAILED
    }

    const hotspot = await DeliveryHotspot.findOne({
      where: { totalDeliveries: { [Op.gt]: 0 } },
      attributes: ['center', 'radius'],
      transaction,
    });
    if (hotspot && driver.current_location) {
      const distance = locationService.calculateDistance(driver.current_location, hotspot.center);
      if (distance > hotspot.radius || distance > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM) {
        throw new AppError('Driver outside delivery hotspot', 400, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
      }
    }

    await order.update(
      {
        driver_id: driverId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4], // out_for_delivery
        staff_id: driver.merchant_id ? driver.user_id : null,
      },
      { transaction }
    );
    await driver.update(
      {
        status: driverConstants.DRIVER_STATUSES[2], // on_delivery
        active_route_id: order.route_id,
      },
      { transaction }
    );

    const task = await Task.create(
      {
        staff_id: driver.user_id,
        branch_id: order.branch_id,
        task_type: staffConstants.STAFF_TASK_TYPES.driver.munch[0], // delivery_handover
        description: `Delivery task for order ${order.order_number}`,
        status: staffConstants.STAFF_TASK_STATUSES[0], // assigned
        due_date: order.estimated_delivery_time || new Date(Date.now() + munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.MIN_DELIVERY_TIME_MINUTES * 60 * 1000),
      },
      { transaction }
    );

    logger.info(`Delivery task assigned: driver ${driverId}, order ${orderId}`, { audit: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY });
    return {
      driverId,
      orderId,
      taskId: task.id,
      orderNumber: order.order_number,
      language: driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY,
      branchName: order.branch?.name || 'N/A',
      vehicleType: driver.vehicles?.[0]?.type || 'N/A',
      routeDistance: order.route?.distance || 'N/A',
      currency: order.currency || localizationConstants.DEFAULT_CURRENCY,
      success: staffConstants.SUCCESS_MESSAGES[5], // delivery_completed
    };
  } catch (error) {
    throw handleServiceError('assignDeliveryTask', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

async function verifyDriverCompliance(driverId, ipAddress, transaction = null) {
  try {
    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'merchant_id', 'license_number', 'phone_number', 'certifications', 'rating'],
      include: [
        { model: Vehicle, as: 'vehicles', attributes: ['id', 'type', 'capacity', 'status'] },
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: DriverRatings, as: 'ratings', attributes: ['rating'] },
        { model: Merchant, as: 'merchant', attributes: ['business_type'] },
      ],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES[1]); // DRIVER_NOT_FOUND
    }

    if (driver.availability?.status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]) { // available
      throw new AppError('Invalid delivery assignment', 400, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
    }

    if (driver.merchant_id && !staffConstants.STAFF_ROLES.driver.supportedMerchantTypes.includes(driver.merchant?.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const isMerchantAttached = driver.merchant_id !== null;
    const requiredCertifications = isMerchantAttached
      ? staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS.driver
      : driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS;

    const compliance = {
      licenseValid: !!driver.license_number,
      vehicleRegistered: driver.vehicles && driver.vehicles.length > 0,
      phoneVerified: !!driver.phone_number,
      certificationsValid: requiredCertifications.every((cert) => driver.certifications?.includes(cert)),
      ratingSatisfactory: driver.ratings?.length
        ? driver.ratings.every((r) => r.rating >= 3.0)
        : true,
      vehicleStatus: driver.vehicles?.every((v) => vehicleConstants.VEHICLE_TYPES.includes(v.type) && v.status === vehicleConstants.VEHICLE_STATUSES[0]), // active
    };

    const status = Object.values(compliance).every((v) => v)
      ? merchantConstants.COMPLIANCE_CONSTANTS.CERTIFICATION_STATUSES[1] // approved
      : merchantConstants.COMPLIANCE_CONSTANTS.CERTIFICATION_STATUSES[2]; // rejected

    if (status === merchantConstants.COMPLIANCE_CONSTANTS.CERTIFICATION_STATUSES[2]) {
      throw new AppError('Compliance check failed', 400, driverConstants.ERROR_CODES[9]); // CERTIFICATION_EXPIRED
    }

    logger.info(`Compliance verified for driver ${driverId}`, { audit: staffConstants.STAFF_AUDIT_ACTIONS[2] }); // staff_compliance_verify
    return {
      driverId,
      status,
      compliance,
      language: driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: staffConstants.STAFF_AUDIT_ACTIONS[2], // staff_compliance_verify
      vehicleCount: driver.vehicles?.length || 0,
      averageRating: driver.ratings?.length
        ? driver.ratings.reduce((sum, r) => sum + r.rating, 0) / driver.ratings.length
        : driver.rating || 0,
      success: driverConstants.SUCCESS_MESSAGES[10], // profile_verified
    };
  } catch (error) {
    throw handleServiceError('verifyDriverCompliance', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

async function monitorDriverPerformance(driverId, startDate, endDate, ipAddress, transaction = null) {
  try {
    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'rating', 'preferred_language'],
      include: [
        { model: DriverRatings, as: 'ratings', attributes: ['rating', 'created_at'] },
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: Vehicle, as: 'vehicles', attributes: ['id', 'type', 'status'] },
      ],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES[1]); // DRIVER_NOT_FOUND
    }

    const orders = await Order.findAll({
      where: {
        driver_id: driverId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5], // delivered
        created_at: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['id', 'created_at', 'actual_delivery_time', 'delivery_distance', 'currency'],
      include: [
        { model: Route, as: 'route', attributes: ['id', 'distance', 'duration', 'trafficModel'] },
        { model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'currency'] },
      ],
      transaction,
    });

    const hotspots = await DeliveryHotspot.findAll({
      where: { totalDeliveries: { [Op.gt]: 0 } },
      attributes: ['id', 'center', 'radius', 'totalDeliveries'],
      transaction,
    });

    const performance = {
      totalDeliveries: orders.length,
      averageDeliveryTime: orders.reduce((sum, order) => {
        const time = order.actual_delivery_time
          ? (order.actual_delivery_time - order.created_at) / 60000
          : 0;
        return sum + time;
      }, 0) / (orders.length || 1),
      averageRating: driver.ratings?.length
        ? driver.ratings.reduce((sum, r) => sum + r.rating, 0) / driver.ratings.length
        : driver.rating || 0,
      hotspotDeliveries: hotspots.length,
      totalDistance: orders.reduce((sum, order) => sum + (order.route?.distance || 0), 0),
      branchesServed: [...new Set(orders.map((order) => order.branch?.id))].filter(Boolean).length,
      ecoRouteAdoption: orders.filter((o) => o.route?.trafficModel === routeConstants.TRAFFIC_MODELS[0]).length, // best_guess
      parkingCompliance: orders.filter((o) => o.route?.trafficModel !== routeConstants.TRAFFIC_MODELS[3]).length, // historical
    };

    if (performance.totalDeliveries > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT) {
      throw new AppError('Max delivery limit exceeded', 400, munchConstants.ERROR_CODES[0]); // ORDER_NOT_FOUND
    }

    logger.info(`Performance monitored for driver ${driverId}`, { audit: munchConstants.AUDIT_TYPES.MONITOR_DELIVERY_PERFORMANCE });
    return {
      driverId,
      performance,
      language: driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.MONITOR_DELIVERY_PERFORMANCE,
      availabilityStatus: driver.availability?.status || 'N/A',
      vehicleStatus: driver.vehicles?.[0]?.status || vehicleConstants.VEHICLE_STATUSES[0], // active
      currency: orders[0]?.currency || localizationConstants.DEFAULT_CURRENCY,
      success: staffConstants.SUCCESS_MESSAGES[5], // delivery_completed
    };
  } catch (error) {
    throw handleServiceError('monitorDriverPerformance', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

async function updateDriverLocation(driverId, locationInput, sessionToken, ipAddress, transaction = null) {
  try {
    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'current_location', 'preferred_language'],
      include: [
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: Vehicle, as: 'vehicles', attributes: ['id', 'type', 'status'] },
        { model: Merchant, as: 'merchant', attributes: ['business_type'] },
      ],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES[1]); // DRIVER_NOT_FOUND
    }

    if (driver.availability?.status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]) { // available
      throw new AppError('Invalid delivery assignment', 400, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
    }

    if (driver.vehicles?.every((v) => !vehicleConstants.VEHICLE_TYPES.includes(v.type))) {
      throw new AppError('Invalid vehicle type', 400, vehicleConstants.ERROR_CODES[0]); // INVALID_VEHICLE_TYPE