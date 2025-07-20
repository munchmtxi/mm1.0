'use strict';

const { Op } = require('sequelize');
const moment = require('moment');
const { Driver, DriverAvailability, Ride, Order, DriverRatings, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const munchConstants = require('@constants/common/munchConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getEngagementAnalytics(driverId, period) {
  if (!driverConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
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
    const availability = await DriverAvailability.findAll({
      where: {
        driver_id: driverId,
        status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.available,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });
    const highDemandAvailability = availability.filter(a =>
      driverConstants.AVAILABILITY_CONSTANTS.HIGH_DEMAND_PERIODS.includes(a.period)
    ).length;

    const rides = await Ride.findAll({
      where: {
        driverId,
        status: { [Op.in]: mtxiConstants.RIDE_STATUSES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['acceptance_time', 'created_at'],
      transaction,
    });
    const orders = await Order.findAll({
      where: {
        driver_id: driverId,
        status: { [Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES },
        created_at: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['acceptance_time', 'created_at'],
      transaction,
    });
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });

    const avgResponseTime = [...rides, ...orders].reduce((sum, task) => {
      if (task.acceptance_time && task.created_at) {
        return sum + moment(task.acceptance_time).diff(moment(task.created_at), 'seconds');
      }
      return sum;
    }, 0) / ([...rides, ...orders].length || 1);

    const analytics = {
      period,
      high_demand_availability: highDemandAvailability,
      avg_response_time_seconds: avgResponseTime.toFixed(2),
      customer_rating: parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2),
      total_tasks: rides.length + orders.length,
      recommendations: avgResponseTime > 60 ? ['Improve task acceptance speed'] : ['Maintain quick response times'],
    };

    await transaction.commit();
    logger.info('Engagement analytics retrieved', { driverId, period });
    return analytics;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get engagement analytics failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = { getEngagementAnalytics };