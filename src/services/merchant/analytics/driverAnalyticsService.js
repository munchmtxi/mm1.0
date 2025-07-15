'use strict';

const { Op } = require('sequelize');
const { Driver, DriverRatings, Order, Route, Merchant } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const munchConstants = require('@constants/common/munchConstants');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function monitorDriverMetrics(driverId, ipAddress, transaction = null) {
  try {
    if (!driverId) {
      throw new AppError('Invalid driver ID', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }

    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'name'],
      include: [{ model: Merchant, as: 'merchant', attributes: ['preferred_language'] }],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const [orders, ratings, routes] = await Promise.all([
      Order.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
        attributes: ['estimated_delivery_time', 'actual_delivery_time'],
        transaction,
      }),
      DriverRatings.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
        attributes: ['rating'],
        transaction,
      }),
      Route.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
        attributes: ['distance', 'duration'],
        transaction,
      }),
    ]);

    const avgDeliveryTime = orders.length
      ? orders.reduce((sum, o) => {
          if (o.estimated_delivery_time && o.actual_delivery_time) {
            return sum + (new Date(o.actual_delivery_time) - new Date(o.estimated_delivery_time)) / 1000 / 60;
          }
          return sum;
        }, 0) / orders.length
      : 0;

    const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / ratings.length : 0;
    const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0);

    await Driver.update({ rating: avgRating }, { where: { id: driverId }, transaction });

    logger.info(`Driver metrics monitored for driver ${driverId}`);
    return {
      driverId,
      metrics: {
        avgDeliveryTime: avgDeliveryTime.toFixed(2),
        avgRating: avgRating.toFixed(2),
        totalDeliveries: orders.length,
        totalDistance: totalDistance.toFixed(2),
      },
      language: driver.merchant?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.MONITOR_DELIVERY_PERFORMANCE,
    };
  } catch (error) {
    throw handleServiceError('monitorDriverMetrics', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function generateDriverReports(driverId, ipAddress, transaction = null) {
  try {
    if (!driverId) {
      throw new AppError('Invalid driver ID', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }

    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'name'],
      include: [{ model: Merchant, as: 'merchant', attributes: ['preferred_language'] }],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    const [orders, ratings, routes] = await Promise.all([
      Order.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) },
        },
        transaction,
      }),
      DriverRatings.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) },
        },
        transaction,
      }),
      Route.findAll({
        where: {
          driver_id: driverId,
          created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) },
        },
        transaction,
      }),
    ]);

    const totalDeliveries = orders.length;
    const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / ratings.length : 0;
    const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0);
    const avgDeliveryTime = orders.length
      ? orders.reduce((sum, o) => {
          if (o.estimated_delivery_time && o.actual_delivery_time) {
            return sum + (new Date(o.actual_delivery_time) - new Date(o.estimated_delivery_time)) / 1000 / 60;
          }
          return sum;
        }, 0) / orders.length
      : 0;

    logger.info(`Driver report generated for driver ${driverId}`);
    return {
      driverId,
      report: {
        driverName: driver.name,
        totalDeliveries,
        avgRating: avgRating.toFixed(2),
        totalDistance: totalDistance.toFixed(2),
        avgDeliveryTime: avgDeliveryTime.toFixed(2),
      },
      language: driver.merchant?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.MONITOR_DELIVERY_PERFORMANCE,
    };
  } -v
    throw handleServiceError('generateDriverReports', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function provideDriverFeedback(driverId, feedback, ipAddress, transaction = null) {
  try {
    if (!driverId || !feedback || !feedback.message) {
      throw new AppError('Invalid feedback', 400, driverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT);
    }

    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id'],
      include: [{ model: Merchant, as: 'merchant', attributes: ['preferred_language'] }],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    // Notification creation is handled by the controller's notification service
    logger.info(`Feedback provided for driver ${driverId}`);
    return {
      driverId,
      feedback: { message: feedback.message },
      language: driver.merchant?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
    };
  } catch (error) {
    throw handleServiceError('provideDriverFeedback', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { monitorDriverMetrics, generateDriverReports, provideDriverFeedback };