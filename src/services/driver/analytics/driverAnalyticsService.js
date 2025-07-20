'use strict';

const { Op } = require('sequelize');
const moment = require('moment');
const math = require('mathjs');
const {
  Driver,
  Ride,
  Order,
  DriverRatings,
  DriverEarnings,
  DriverAvailability,
  DriverPerformanceMetric,
  DriverSafetyIncident,
  DriverSupportTicket,
  Payout,
  Route,
  Vehicle,
  sequelize,
} = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const payoutConstants = require('@constants/driver/payoutConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const munchConstants = require('@constants/common/munchConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getPerformanceMetrics(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const startDate = moment().subtract(30, 'days').toDate();
  const endDate = moment().toDate();

  const transaction = await sequelize.transaction();
  try {
    const rides = await Ride.count({
      where: {
        driverId,
        status: mtxiConstants.RIDE_STATUSES.COMPLETED,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const totalRides = await Ride.count({
      where: { driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const orders = await Order.count({
      where: {
        driver_id: driverId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.delivered,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const totalOrders = await Order.count({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });
    const avgRating = ratings[0]?.dataValues.avg_rating || 0;
    const earnings = await DriverEarnings.sum('total_earned', {
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const availability = await DriverAvailability.findAll({
      where: {
        driver_id: driverId,
        status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.available,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const activeHours = availability.reduce((total, record) => {
      const start = moment(`${record.date} ${record.start_time}`);
      const end = moment(`${record.date} ${record.end_time}`);
      return total + end.diff(start, 'hours', true);
    }, 0);
    const safetyIncidents = await DriverSafetyIncident.count({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const supportTickets = await DriverSupportTicket.count({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      transaction,
    });
    const vehicles = await Vehicle.count({
      where: {
        driver_id: driverId,
        type: { [Op.in]: vehicleConstants.VEHICLE_TYPES },
        status: vehicleConstants.VEHICLE_STATUSES.active,
      },
      transaction,
    });

    const metrics = {
      ride_completion_rate: totalRides ? (rides / totalRides) * 100 : 0,
      delivery_completion_rate: totalOrders ? (orders / totalOrders) * 100 : 0,
      avg_rating: parseFloat(avgRating).toFixed(2),
      total_earnings: earnings || 0,
      active_hours: activeHours.toFixed(2),
      safety_incidents: safetyIncidents,
      support_tickets: supportTickets,
      active_vehicles: vehicles,
    };

    for (const [metric_type, value] of Object.entries(metrics)) {
      if (driverConstants.ANALYTICS_CONSTANTS.METRICS.includes(metric_type)) {
        await DriverPerformanceMetric.create(
          { driver_id: driverId, metric_type, value, recorded_at: new Date() },
          { transaction }
        );
      }
    }

    await transaction.commit();
    logger.info('Performance metrics retrieved', { driverId, metrics });
    return metrics;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get performance metrics failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function generateAnalyticsReport(driverId, period) {
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_FREQUENCIES.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const startDate = moment()
    .subtract(1, period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'biweekly' ? 'weeks' : 'month')
    .startOf('day')
    .toDate();
  const endDate = moment().endOf('day').toDate();

  const transaction = await sequelize.transaction();
  try {
    const payouts = await Payout.sum('amount', {
      where: {
        driver_id: driverId,
        status: payoutConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    }) || 0;
    const rides = await Ride.findAll({
      where: {
        driverId,
        status: { [Op.in]: mtxiConstants.RIDE_STATUSES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['status', 'scheduledTime', 'created_at'],
      include: [{ model: Route, as: 'route', attributes: ['distance', 'duration'] }],
      transaction,
    });
    const orders = await Order.findAll({
      where: {
        driver_id: driverId,
        status: { [Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['status', 'total_amount', 'delivery_distance', 'created_at'],
      include: [{ model: Route, as: 'route', attributes: ['distance', 'duration'] }],
      transaction,
    });
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });
    const safetyIncidents = await DriverSafetyIncident.count({
      where: {
        driver_id: driverId,
        incident_type: { [Op.in]: driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const supportTickets = await DriverSupportTicket.count({
      where: {
        driver_id: driverId,
        issue_type: { [Op.in]: driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const vehicles = await Vehicle.count({
      where: {
        driver_id: driverId,
        type: { [Op.in]: vehicleConstants.VEHICLE_TYPES },
        status: vehicleConstants.VEHICLE_STATUSES.active,
      },
      transaction,
    });

    const country = driver.service_area?.country || 'US';
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[country] || localizationConstants.DEFAULT_CURRENCY;
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_COMPLIANCE.TAX_RATES[country]?.VAT || 0;

    const report = {
      period,
      financial: {
        total_earnings: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        total_payouts: payouts,
        total_taxes: (orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * taxRate).toFixed(2),
        currency,
      },
      operational: {
        total_rides: rides.length,
        completed_rides: rides.filter(r => r.status === mtxiConstants.RIDE_STATUSES.COMPLETED).length,
        total_deliveries: orders.length,
        completed_deliveries: orders.filter(o => o.status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.delivered).length,
        avg_rating: parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2),
        total_distance: rides.reduce((sum, r) => sum + (r.route?.distance || 0), 0) +
                        orders.reduce((sum, o) => sum + (o.delivery_distance || 0), 0),
        safety_incidents: safetyIncidents,
        support_tickets: supportTickets,
        active_vehicles: vehicles,
      },
    };

    await transaction.commit();
    logger.info('Analytics report generated', { driverId, period });
    return report;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Generate analytics report failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function getRecommendations(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const metrics = await getPerformanceMetrics(driverId);
  const recommendations = [];

  const thresholds = driverConstants.ANALYTICS_CONSTANTS.RECOMMENDATION_THRESHOLDS || {
    ride_completion_rate: 80,
    delivery_completion_rate: 80,
    avg_rating: 4.0,
    active_hours: 20,
    safety_incidents: 0,
    support_tickets: 2,
  };

  if (metrics.ride_completion_rate < thresholds.ride_completion_rate) {
    recommendations.push('Improve ride completion rate to meet minimum threshold');
  }
  if (metrics.delivery_completion_rate < thresholds.delivery_completion_rate) {
    recommendations.push('Improve delivery completion rate to meet minimum threshold');
  }
  if (metrics.avg_rating < thresholds.avg_rating) {
    recommendations.push('Enhance customer satisfaction to improve ratings');
  }
  if (metrics.active_hours < thresholds.active_hours) {
    recommendations.push('Increase availability during high-demand periods');
  }
  if (metrics.safety_incidents > thresholds.safety_incidents) {
    recommendations.push('Review and address safety incidents promptly');
  }
  if (metrics.support_tickets > thresholds.support_tickets) {
    recommendations.push('Resolve open support tickets to improve performance');
  }
  if (metrics.active_vehicles < driverConstants.DRIVER_SETTINGS.MAX_VEHICLES_PER_DRIVER) {
    recommendations.push('Consider registering additional vehicles for flexibility');
  }

  logger.info('Recommendations generated', { driverId, recommendations });
  return recommendations;
}

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
          where: {
            driverId: id,
            status: mtxiConstants.RIDE_STATUSES.COMPLETED,
            created_at: { [Op.between]: [startDate, endDate] },
          },
          transaction,
        });
        const totalRides = await Ride.count({
          where: { driverId: id, created_at: { [Op.between]: [startDate, endDate] } },
          transaction,
        });
        const orders = await Order.count({
          where: {
            driver_id: id,
            status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.delivered,
            created_at: { [Op.between]: [startDate, endDate] },
          },
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
        const safetyIncidents = await DriverSafetyIncident.count({
          where: {
            driver_id: id,
            incident_type: { [Op.in]: driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES },
            created_at: { [Op.between]: [startDate, endDate] },
          },
          transaction,
        });
        const supportTickets = await DriverSupportTicket.count({
          where: {
            driver_id: id,
            issue_type: { [Op.in]: driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES },
            created_at: { [Op.between]: [startDate, endDate] },
          },
          transaction,
        });
        const vehicles = await Vehicle.count({
          where: {
            driver_id: id,
            type: { [Op.in]: vehicleConstants.VEHICLE_TYPES },
            status: vehicleConstants.VEHICLE_STATUSES.active,
          },
          transaction,
        });

        return {
          driver_id: id,
          completion_rate: ((rides + orders) / (totalRides + totalOrders) || 1) * 100,
          avg_rating: parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2),
          total_earnings: earnings || 0,
          safety_incidents: safetyIncidents,
          support_tickets: supportTickets,
          active_vehicles: vehicles,
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
        avg_safety_incidents: math.mean(metrics.map(m => m.safety_incidents)),
        avg_support_tickets: math.mean(metrics.map(m => m.support_tickets)),
        avg_active_vehicles: math.mean(metrics.map(m => m.active_vehicles)),
      },
    };

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