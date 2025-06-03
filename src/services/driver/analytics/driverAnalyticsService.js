'use strict';

/**
 * Driver Analytics Service
 * Provides analytics and performance insights for drivers, including metrics, reports, recommendations, and peer comparisons.
 */

const { Op } = require('sequelize');
const moment = require('moment');
const math = require('mathjs');
const {
  Driver,
  Ride,
  Order,
  DriverRatings,
  DriverEarnings,
  FinancialSummary,
  Payout,
  DriverAvailability,
  DriverPerformanceMetric,
  sequelize,
} = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Retrieves operational metrics for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} - Metrics including completion rates, ratings, earnings, active hours.
 */
async function getPerformanceMetrics(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const startDate = moment().subtract(30, 'days').toDate();
  const endDate = moment().toDate();

  const transaction = await sequelize.transaction();
  try {
    // Ride and delivery counts
    const rides = await Ride.count({
      where: { driverId, status: 'COMPLETED', created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const totalRides = await Ride.count({
      where: { driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const orders = await Order.count({
      where: { driver_id: driverId, status: 'completed', created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const totalOrders = await Order.count({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });

    // Ratings
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });
    const avgRating = ratings[0]?.dataValues.avg_rating || 0;

    // Earnings
    const earnings = await DriverEarnings.sum('total_earned', {
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });

    // Active hours
    const availability = await DriverAvailability.findAll({
      where: {
        driver_id: driverId,
        status: 'available',
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const activeHours = availability.reduce((total, record) => {
      const start = moment(`${record.date} ${record.start_time}`);
      const end = moment(`${record.date} ${record.end_time}`);
      return total + end.diff(start, 'hours', true);
    }, 0);

    const metrics = {
      ride_completion_rate: totalRides ? (rides / totalRides) * 100 : 0,
      delivery_completion_rate: totalOrders ? (orders / totalOrders) * 100 : 0,
      avg_rating: parseFloat(avgRating).toFixed(2),
      total_earnings: earnings || 0,
      active_hours: activeHours.toFixed(2),
    };

    // Store metrics in DriverPerformanceMetric
    for (const [metric_type, value] of Object.entries(metrics)) {
      await DriverPerformanceMetric.create(
        { driver_id: driverId, metric_type, value, recorded_at: new Date() },
        { transaction }
      );
    }

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_PERFORMANCE_METRICS',
        details: { driverId, metrics },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'analytics:metrics_updated', { driverId, metrics });

    await transaction.commit();
    logger.info('Performance metrics retrieved', { driverId, metrics });
    return metrics;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get performance metrics failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

/**
 * Generates a performance report for a specified period.
 * @param {number} driverId - Driver ID.
 * @param {string} period - Period ('daily', 'weekly', 'monthly', 'yearly').
 * @returns {Promise<Object>} - Report with financial and operational data.
 */
async function generateAnalyticsReport(driverId, period) {
  if (!driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const startDate = moment()
    .subtract(1, period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year')
    .startOf('day')
    .toDate();
  const endDate = moment().endOf('day').toDate();

  const transaction = await sequelize.transaction();
  try {
    // Financial data
    const financialSummary = await FinancialSummary.findOne({
      where: { driver_id: driverId, period, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    }) || { total_earnings: 0, total_payouts: 0, total_taxes: 0, currency: 'USD' };

    // Operational data
    const rides = await Ride.findAll({
      where: { driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: ['status', 'scheduledTime', 'created_at'],
      include: [{ model: Route, as: 'route', attributes: ['distance', 'duration'] }],
      transaction,
    });
    const orders = await Order.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: ['status', 'total_amount', 'delivery_distance', 'created_at'],
      include: [{ model: Route, as: 'route', attributes: ['distance', 'duration'] }],
      transaction,
    });
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });

    const report = {
      period,
      financial: {
        total_earnings: financialSummary.total_earnings,
        total_payouts: financialSummary.total_payouts,
        total_taxes: financialSummary.total_taxes,
        currency: financialSummary.currency,
      },
      operational: {
        total_rides: rides.length,
        completed_rides: rides.filter(r => r.status === 'COMPLETED').length,
        total_deliveries: orders.length,
        completed_deliveries: orders.filter(o => o.status === 'completed').length,
        avg_rating: parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2),
        total_distance: rides.reduce((sum, r) => sum + (r.route?.distance || 0), 0) +
                        orders.reduce((sum, o) => sum + (o.delivery_distance || 0), 0),
      },
    };

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GENERATE_ANALYTICS_REPORT',
        details: { driverId, period },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANALYTICS_REPORT,
        message: formatMessage(
          'driver',
          'analytics',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'analytics.report_generated',
          { period }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'analytics:report_generated', { driverId, period, report });

    await transaction.commit();
    logger.info('Analytics report generated', { driverId, period });
    return report;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Generate analytics report failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

/**
 * Provides personalized recommendations based on performance.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Array<string>>} - List of recommendations.
 */
async function getRecommendations(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const metrics = await getPerformanceMetrics(driverId);
  const recommendations = [];

  const thresholds = driverConstants.ANALYTICS_CONSTANTS.RECOMMENDATION_THRESHOLDS;
  if (metrics.ride_completion_rate < thresholds.ride_completion_rate) {
    recommendations.push(
      formatMessage(
        'driver',
        'analytics',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'analytics.recommendations.improve_ride_completion'
      )
    );
  }
  if (metrics.delivery_completion_rate < thresholds.delivery_completion_rate) {
    recommendations.push(
      formatMessage(
        'driver',
        'analytics',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'analytics.recommendations.improve_delivery_completion'
      )
    );
  }
  if (metrics.avg_rating < thresholds.avg_rating) {
    recommendations.push(
      formatMessage(
        'driver',
        'analytics',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'analytics.recommendations.improve_rating'
      )
    );
  }
  if (metrics.active_hours < thresholds.active_hours) {
    recommendations.push(
      formatMessage(
        'driver',
        'analytics',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'analytics.recommendations.increase_active_hours'
      )
    );
  }

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_RECOMMENDATIONS',
        details: { driverId, recommendations },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.RECOMMENDATION,
        message: formatMessage(
          'driver',
          'analytics',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'analytics.recommendations_received',
          { count: recommendations.length }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'analytics:recommendations_updated', { driverId, recommendations });

    await transaction.commit();
    logger.info('Recommendations generated', { driverId, recommendations });
    return recommendations;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get recommendations failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

/**
 * Compares driver performance with peers.
 * @param {number} driverId - Driver ID.
 * @param {Array<number>} peers - Array of peer driver IDs.
 * @returns {Promise<Object>} - Comparison data.
 */
async function comparePerformance(driverId, peers) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const startDate = moment().subtract(30, 'days').toDate();
  const endDate = moment().toDate();

  const transaction = await sequelize.transaction();
  try {
    const metrics = await Promise.all(
      [driverId, ...peers].map(async (id) => {
        const rides = await Ride.count({
          where: { driverId: id, status: 'COMPLETED', created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });
        const totalRides = await Ride.count({
          where: { driverId: id, created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });
        const orders = await Order.count({
          where: { driver_id: id, status: 'completed', created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });
        const totalOrders = await Order.count({
          where: { driver_id: id, created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });
        const ratings = await DriverRatings.findAll({
          where: { driver_id: id, created_at: { [Op.between]: [startDate, endDate] } },
          attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
          transaction,
        });
        const earnings = await DriverEarnings.sum('total_earned', {
          where: { driver_id: id, created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });

        return {
          driver_id: id,
          completion_rate: ((rides + orders) / (totalRides + totalOrders) || 1) * 100,
          avg_rating: parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2),
          total_earnings: earnings || 0,
        };
      })
    );

    const comparison = {
      driver: metrics.find(m => m.driver_id === driverId),
      peers: metrics.filter(m => m.driver_id !== driverId),
      stats: {
        avg_completion_rate: math.mean(metrics.map(m => m.completion_rate)),
        avg_rating: math.mean(metrics.map(m => parseFloat(m.avg_rating))),
        avg_earnings: math.mean(metrics.map(m => m.total_earnings)),
      },
    };

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'COMPARE_PERFORMANCE',
        details: { driverId, peerCount: peers.length },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'analytics:performance_comparison', { driverId, comparison });

    await transaction.commit();
    logger.info('Performance comparison completed', { driverId, peerCount: peers.length });
    return comparison;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Compare performance failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  getPerformanceMetrics,
  generateAnalyticsReport,
  getRecommendations,
  comparePerformance,
};