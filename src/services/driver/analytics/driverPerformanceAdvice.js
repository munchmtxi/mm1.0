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

async function getDriverPerformanceAdvice(driverId, period) {
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
    // Fetch performance metrics
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
      transaction,
    });
    const ratings = await DriverRatings.findAll({
      where: { driver_id: driverId, created_at: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
      transaction,
    });
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
    const vehicles = await Vehicle.findAll({
      where: {
        driver_id: driverId,
        type: { [Op.in]: vehicleConstants.VEHICLE_TYPES },
        status: vehicleConstants.VEHICLE_STATUSES.active,
      },
      attributes: ['type', 'last_maintenance_date', 'inspection_status'],
      transaction,
    });
    const payouts = await Payout.sum('amount', {
      where: {
        driver_id: driverId,
        status: payoutConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
        created_at: { [Op.between]: [startDate, endDate] },
      },
      transaction,
    });

    // Calculate key metrics
    const totalRides = rides.length;
    const completedRides = rides.filter(r => r.status === mtxiConstants.RIDE_STATUSES.COMPLETED).length;
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.delivered).length;
    const avgRating = parseFloat(ratings[0]?.dataValues.avg_rating || 0).toFixed(2);
    const activeHours = availability.reduce((total, record) => {
      const start = moment(`${record.date} ${record.start_time}`);
      const end = moment(`${record.date} ${record.end_time}`);
      return total + end.diff(start, 'hours', true);
    }, 0);
    const totalDistance = rides.reduce((sum, r) => sum + (r.route?.distance || 0), 0) +
                         orders.reduce((sum, o) => sum + (o.delivery_distance || 0), 0);

    const country = driver.service_area?.country || 'US';
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[country] || localizationConstants.DEFAULT_CURRENCY;
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_COMPLIANCE.TAX_RATES[country]?.VAT || 0;

    // Define performance thresholds
    const thresholds = {
      ride_completion_rate: 80,
      delivery_completion_rate: 80,
      avg_rating: 4.0,
      active_hours: 20,
      safety_incidents: 0,
      support_tickets: 2,
      earnings_per_hour: 15,
      maintenance_due_days: vehicleConstants.MAINTENANCE_SETTINGS.MAINTENANCE_ALERT_FREQUENCY_DAYS,
    };

    // Generate insights and advice
    const advice = [];
    const insights = [];

    // Ride and Delivery Performance
    const rideCompletionRate = totalRides ? (completedRides / totalRides) * 100 : 0;
    if (rideCompletionRate < thresholds.ride_completion_rate) {
      insights.push(`Ride completion rate (${rideCompletionRate.toFixed(2)}%) is below the recommended ${thresholds.ride_completion_rate}%.`);
      advice.push({
        priority: 'high',
        message: 'Focus on accepting and completing more rides to boost completion rate.',
        action: 'Review ride cancellations and prioritize timely pickups.',
      });
    } else {
      insights.push(`Strong ride completion rate (${rideCompletionRate.toFixed(2)}%)!`);
      advice.push({
        priority: 'low',
        message: 'Maintain high ride completion rate.',
        action: 'Continue prioritizing timely ride acceptance.',
      });
    }

    const deliveryCompletionRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;
    if (deliveryCompletionRate < thresholds.delivery_completion_rate) {
      insights.push(`Delivery completion rate (${deliveryCompletionRate.toFixed(2)}%) is below the recommended ${thresholds.delivery_completion_rate}%.`);
      advice.push({
        priority: 'high',
        message: 'Improve delivery completion by ensuring timely order pickups.',
        action: 'Check order assignment notifications and optimize route planning.',
      });
    } else {
      insights.push(`Excellent delivery completion rate (${deliveryCompletionRate.toFixed(2)}%)!`);
      advice.push({
        priority: 'low',
        message: 'Keep up the high delivery completion rate.',
        action: 'Continue leveraging AI route optimization.',
      });
    }

    // Customer Satisfaction
    if (avgRating < thresholds.avg_rating) {
      insights.push(`Average rating (${avgRating}) is below the target of ${thresholds.avg_rating}.`);
      advice.push({
        priority: 'medium',
        message: 'Enhance customer satisfaction to improve ratings.',
        action: `Complete customer interaction training from ${driverConstants.ONBOARDING_CONSTANTS.TRAINING_MODULES[2]}.`,
      });
    } else {
      insights.push(`Great customer rating (${avgRating})!`);
      advice.push({
        priority: 'low',
        message: 'Maintain excellent customer interactions.',
        action: 'Continue engaging positively with customers.',
      });
    }

    // Earnings and Efficiency
    const earningsPerHour = activeHours ? (earnings / activeHours).toFixed(2) : 0;
    if (earningsPerHour < thresholds.earnings_per_hour) {
      insights.push(`Earnings per hour (${earningsPerHour} ${currency}/hr) are below the target of ${thresholds.earnings_per_hour} ${currency}/hr.`);
      advice.push({
        priority: 'medium',
        message: 'Increase earnings by targeting high-demand periods.',
        action: `Schedule shifts during ${driverConstants.AVAILABILITY_CONSTANTS.HIGH_DEMAND_PERIODS.join(', ')}.`,
      });
    } else {
      insights.push(`Solid earnings per hour (${earningsPerHour} ${currency}/hr)!`);
      advice.push({
        priority: 'low',
        message: 'Optimize earnings by maintaining high-demand availability.',
        action: 'Explore premium ride opportunities for higher payouts.',
      });
    }

    // Safety and Support
    if (safetyIncidents > thresholds.safety_incidents) {
      insights.push(`Safety incidents (${safetyIncidents}) detected in the period.`);
      advice.push({
        priority: 'urgent',
        message: 'Address safety concerns immediately.',
        action: `Review safety protocols in ${driverConstants.ONBOARDING_CONSTANTS.TRAINING_MODULES[1]} and report incidents via ${driverConstants.SAFETY_CONSTANTS.SOS_METHODS[0]}.`,
      });
    } else {
      insights.push('No safety incidents reported. Great job!');
      advice.push({
        priority: 'low',
        message: 'Continue prioritizing safe driving.',
        action: 'Regularly review safety guidelines.',
      });
    }

    if (supportTickets > thresholds.support_tickets) {
      insights.push(`High support tickets (${supportTickets}) indicate operational issues.`);
      advice.push({
        priority: 'medium',
        message: 'Resolve open support tickets promptly.',
        action: `Contact support via ${driverConstants.SUPPORT_CONSTANTS.SUPPORT_CHANNELS[0]} to address issues.`,
      });
    } else {
      insights.push('Minimal support tickets. Excellent operational performance!');
      advice.push({
        priority: 'low',
        message: 'Keep support interactions low.',
        action: 'Continue proactive issue resolution.',
      });
    }

    // Vehicle Maintenance
    const maintenanceDue = vehicles.filter(v =>
      moment(v.last_maintenance_date).add(thresholds.maintenance_due_days, 'days').isBefore(endDate)
    ).length;
    if (maintenanceDue > 0) {
      insights.push(`${maintenanceDue} vehicle(s) overdue for maintenance.`);
      advice.push({
        priority: 'high',
        message: 'Schedule vehicle maintenance to ensure compliance.',
        action: `Perform ${vehicleConstants.MAINTENANCE_SETTINGS.MAINTENANCE_TYPES[4]} as required.`,
      });
    } else {
      insights.push('All vehicles are up-to-date on maintenance.');
      advice.push({
        priority: 'low',
        message: 'Maintain regular vehicle maintenance.',
        action: `Schedule next maintenance within ${thresholds.maintenance_due_days} days.`,
      });
    }

    // Payout Optimization
    const payoutRatio = earnings ? (payouts / earnings) * 100 : 0;
    if (payoutRatio < 80) {
      insights.push(`Payout ratio (${payoutRatio.toFixed(2)}%) is low. Consider adjusting payout schedule.`);
      advice.push({
        priority: 'medium',
        message: 'Optimize payout frequency for better cash flow.',
        action: `Switch to ${payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_FREQUENCIES[0]} payouts for faster access.`,
      });
    } else {
      insights.push(`Healthy payout ratio (${payoutRatio.toFixed(2)}%).`);
      advice.push({
        priority: 'low',
        message: 'Maintain efficient payout schedule.',
        action: `Review payout methods: ${payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_PAYOUT_METHODS.join(', ')}.`,
      });
    }

    // Trend Analysis
    const prevPeriodStart = moment(startDate).subtract(1, period).toDate();
    const prevPeriodEnd = moment(startDate).endOf('day').toDate();
    const prevEarnings = await DriverEarnings.sum('total_earned', {
      where: { driver_id: driverId, created_at: { [Op.between]: [prevPeriodStart, prevPeriodEnd] } },
      transaction,
    });
    const earningsTrend = prevEarnings ? ((earnings - prevEarnings) / prevEarnings * 100).toFixed(2) : 0;
    if (earningsTrend < 0) {
      insights.push(`Earnings dropped by ${Math.abs(earningsTrend)}% compared to previous ${period}.`);
      advice.push({
        priority: 'medium',
        message: 'Boost earnings by targeting high-demand areas.',
        action: `Focus on cities like ${localizationConstants.SUPPORTED_CITIES[country]?.join(', ')} during peak hours.`,
      });
    } else {
      insights.push(`Earnings increased by ${earningsTrend}% compared to previous ${period}!`);
      advice.push({
        priority: 'low',
        message: 'Sustain earnings growth.',
        action: 'Continue targeting high-demand periods and locations.',
      });
    }

    const response = {
      period,
      insights,
      advice: advice.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      summary: {
        total_earnings: earnings || 0,
        total_distance: totalDistance.toFixed(2),
        active_hours: activeHours.toFixed(2),
        avg_rating,
        currency,
      },
    };

    // Log advice for audit
    await DriverPerformanceMetric.create(
      {
        driver_id: driverId,
        metric_type: 'performance_advice',
        value: JSON.stringify(response.advice),
        recorded_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    logger.info('Performance advice generated', { driverId, period, adviceCount: advice.length });
    return response;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get performance advice failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = { getDriverPerformanceAdvice };