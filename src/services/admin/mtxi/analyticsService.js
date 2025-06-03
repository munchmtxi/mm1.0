'use strict';

/**
 * Analytics Service for mtxi (Admin)
 * Provides ride completion rates, tip distribution, ride reports, and driver performance metrics.
 * Integrates with notification, socket, audit, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Driver, Ride, Tip, Payment, Route } = require('@models');
const rideConstants = require('@constants/common/rideConstants');
const tipConstants = require('@constants/common/tipConstants');
const driverConstants = require('@constants/common/driverConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');
const { Op } = require('sequelize');

/**
 * Retrieves ride completion rates for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Ride completion analytics.
 */
async function getRideAnalytics(driverId) {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const rides = await Ride.findAll({
      where: { driverId },
      attributes: ['status', 'created_at'],
    });

    if (!rides.length) {
      throw new AppError(
        'no rides found',
        404,
        rideConstants.ERROR_CODES.NO_COMPLETED_RIDES
      );
    }

    const totalRides = rides.length;
    const completedRides = rides.filter(ride => ride.status === rideConstants.RIDE_STATUSES.COMPLETED).length;
    const completionRate = (completedRides / totalRides) * 100;
    const cancelledRides = rides.filter(ride => ride.status === rideConstants.RIDE_STATUSES.CANCELLED).length;
    const cancellationRate = (cancelledRides / totalRides) * 100;

    const analytics = {
      driverId,
      totalRides,
      completedRides,
      completionRate: parseFloat(completionRate.toFixed(2)),
      cancelledRides,
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_UPDATE,
      messageKey: 'analytics.ride_completion',
      messageParams: { driverId, completionRate: analytics.completionRate },
      role: 'driver',
      module: 'mtxi',
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: rideConstants.ANALYTICS_CONSTANTS.METRICS.RIDE_COMPLETION_RATE,
      details: { driverId, totalRides, completionRate: analytics.completionRate },
      ipAddress: 'unknown',
    });

    logger.info('Ride analytics retrieved', { driverId, completionRate: analytics.completionRate });
    return analytics;
  } catch (error) {
    logger.logErrorEvent(`getRideAnalytics failed: ${error.message}`, { driverId });
    throw error;
  }
}

/**
 * Analyzes tip distribution for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Tip distribution analytics.
 */
async function getTipAnalytics(driverId) {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const tips = await Tip.findAll({
      where: {
        recipient_id: driver.user_id,
        status: tipConstants.TIP_SETTINGS.TIP_STATUSES[1], // completed
        ride_id: { [Op.not]: null },
      },
      attributes: ['amount', 'currency', 'created_at'],
    });

    if (!tips.length) {
      throw new AppError(
        'no tips found',
        404,
        tipConstants.ERROR_CODES.TIP_NOT_FOUND
      );
    }

    const totalTips = tips.length;
    const totalTipAmount = tips.reduce((sum, tip) => sum + parseFloat(tip.amount), 0);
    const averageTip = totalTips ? totalTipAmount / totalTips : 0;
    const currency = tips[0]?.currency || tipConstants.TIP_SETTINGS.DEFAULT_CURRENCY;

    const analytics = {
      driverId,
      totalTips,
      totalTipAmount: parseFloat(totalTipAmount.toFixed(2)),
      averageTip: parseFloat(averageTip.toFixed(2)),
      currency,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
      messageKey: 'analytics.tip_distribution',
      messageParams: { driverId, averageTip: analytics.averageTip },
      role: 'driver',
      module: 'mtxi',
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.ANALYTICS_CONSTANTS.METRICS.CUSTOMER_RATINGS,
      details: { driverId, totalTips, averageTip: analytics.averageTip },
      ipAddress: 'unknown',
    });

    logger.info('Tip analytics retrieved', { driverId, averageTip: analytics.averageTip });
    return analytics;
  } catch (error) {
    logger.logErrorEvent(`getTipAnalytics failed: ${error.message}`, { driverId });
    throw error;
  }
}

/**
 * Generates ride reports for a driver.
 * @param {number} driverId - Driver ID.
 * @param {string} format - Report format (pdf, csv, json).
 * @param {string} period - Report period (daily, weekly, monthly, yearly).
 * @returns {Promise<Object>} Report details.
 */
async function exportRideReports(driverId, format = 'json', period = 'monthly') {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    if (!rideConstants.ANALYTICS_CONSTANTS.REPORT_FORMATS.includes(format)) {
      throw new AppError(
        'invalid report format',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    if (!rideConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
      throw new AppError(
        'invalid report period',
        400,
        rideConstants.ERROR_CODES.INVALID_RIDE
      );
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const dateFilter = {};
    const now = new Date();
    if (period === 'daily') {
      dateFilter.created_at = { [Op.gte]: new Date(now.setHours(0, 0, 0, 0)) };
    } else if (period === 'weekly') {
      dateFilter.created_at = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
    } else if (period === 'monthly') {
      dateFilter.created_at = { [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };
    } else if (period === 'yearly') {
      dateFilter.created_at = { [Op.gte]: new Date(now.setFullYear(now.getFullYear() - 1)) };
    }

    const rides = await Ride.findAll({
      where: { driverId, ...dateFilter },
      include: [
        { model: Payment, as: 'payment', attributes: ['amount', 'status'] },
        { model: Route, as: 'route', attributes: ['distance', 'duration'] },
      ],
    });

    if (!rides.length) {
      throw new AppError(
        'no rides found for period',
        404,
        rideConstants.ERROR_CODES.NO_COMPLETED_RIDES
      );
    }

    const reportData = rides.map(ride => ({
      rideId: ride.id,
      status: ride.status,
      distance: ride.route?.distance || 0,
      duration: ride.route?.duration || 0,
      earnings: ride.payment?.amount || 0,
      date: ride.created_at,
    }));

    // Simulate report generation
    const report = {
      driverId,
      period,
      format,
      totalRides: rides.length,
      totalEarnings: rides.reduce((sum, ride) => sum + (ride.payment?.amount || 0), 0),
      totalDistance: rides.reduce((sum, ride) => sum + (ride.route?.distance || 0), 0),
      data: reportData,
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_COMPLETED,
      messageKey: 'analytics.report_generated',
      messageParams: { driverId, period, format },
      role: 'driver',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'analytics:report_generated', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      period,
      format,
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: rideConstants.ANALYTICS_CONSTANTS.METRICS.DRIVER_EARNINGS,
      details: { driverId, period, format, totalRides: rides.length },
      ipAddress: 'unknown',
    });

    logger.info('Ride report generated', { driverId, period, format });
    return report;
  } catch (error) {
    logger.logErrorEvent(`exportRideReports failed: ${error.message}`, { driverId, format, period });
    throw error;
  }
}

/**
 * Tracks driver performance metrics.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Driver performance analytics.
 */
async function analyzeDriverPerformance(driverId) {
  try {
    if (!driverId) {
      throw new AppError(
        'driver_id required',
        400,
        driverConstants.ERROR_CODES.INVALID_DRIVER
      );
    }

    const driver = await Driver.findByPk(driverId, {
      include: [{ model: sequelize.models.User, as: 'user' }],
    });
    if (!driver) {
      throw new AppError(
        'driver not found',
        404,
        driverConstants.ERROR_CODES.DRIVER_NOT_FOUND
      );
    }

    const rides = await Ride.findAll({
      where: { driverId, status: rideConstants.RIDE_STATUSES.COMPLETED },
      include: [
        { model: Payment, as: 'payment', attributes: ['amount'] },
        { model: Route, as: 'route', attributes: ['distance', 'duration'] },
      ],
    });

    const tips = await Tip.findAll({
      where: {
        recipient_id: driver.user_id,
        status: tipConstants.TIP_SETTINGS.TIP_STATUSES[1], // completed
        ride_id: { [Op.not]: null },
      },
      attributes: ['amount'],
    });

    const totalRides = rides.length;
    const totalEarnings = rides.reduce((sum, ride) => sum + (ride.payment?.amount || 0), 0);
    const totalDistance = rides.reduce((sum, ride) => sum + (ride.route?.distance || 0), 0);
    const totalTipAmount = tips.reduce((sum, tip) => sum + parseFloat(tip.amount), 0);
    const averageRideDuration = totalRides ? rides.reduce((sum, ride) => sum + (ride.route?.duration || 0), 0) / totalRides : 0;
    const rating = driver.rating || 0;

    const performance = {
      driverId,
      totalRides,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalTips: tips.length,
      totalTipAmount: parseFloat(totalTipAmount.toFixed(2)),
      averageRideDuration: parseFloat(averageRideDuration.toFixed(2)),
      rating: parseFloat(rating.toFixed(2)),
      recommendations: totalRides < 10 ? ['Increase ride frequency in high-demand areas'] : ['Maintain performance'],
    };

    // Send notification
    await notificationService.sendNotification({
      userId: driver.user_id.toString(),
      type: rideConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RIDE_COMPLETED,
      messageKey: 'analytics.performance_updated',
      messageParams: { driverId, totalRides, rating: performance.rating },
      role: 'driver',
      module: 'mtxi',
    });

    // Emit socket event
    await socketService.emit(null, 'analytics:performance_updated', {
      userId: driver.user_id.toString(),
      role: 'driver',
      driverId,
      totalRides,
    });

    // Log audit action
    await auditService.logAction({
      userId: driver.user_id.toString(),
      action: driverConstants.ANALYTICS_CONSTANTS.METRICS.CUSTOMER_RATINGS,
      details: { driverId, totalRides, rating: performance.rating },
      ipAddress: 'unknown',
    });

    logger.info('Driver performance analyzed', { driverId, totalRides });
    return performance;
  } catch (error) {
    logger.logErrorEvent(`analyzeDriverPerformance failed: ${error.message}`, { driverId });
    throw error;
  }
}

module.exports = {
  getRideAnalytics,
  getTipAnalytics,
  exportRideReports,
  analyzeDriverPerformance,
};