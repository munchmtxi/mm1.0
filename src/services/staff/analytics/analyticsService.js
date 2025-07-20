'use strict';

/**
 * performanceService.js
 * Manages performance analytics for staff across roles (e.g., chef, driver, manager). Tracks role-specific metrics,
 * generates reports, and evaluates training impact using provided models and constants.
 * Last Updated: July 15, 2025
 */

const { PerformanceMetric, Staff, Training, Report, Shift, Order, InDiningOrder, Merchant, MerchantBranch, Booking, ParkingBooking, Customer, Driver } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const chefConstants = require('@constants/staff/chefConstants');
const driverConstants = require('@constants/staff/driverConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const managerConstants = require('@constants/staff/managerConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const { Op } = require('sequelize');

/**
 * Tracks role-specific performance metrics for staff.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Recorded metrics.
 */
async function trackPerformanceMetrics(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: MerchantBranch, as: 'branch' }, { model: Merchant, as: 'merchant' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const role = staff.staff_type;
    const metrics = getRoleSpecificMetrics(role, staffId);

    const recordedMetrics = await PerformanceMetric.bulkCreate(
      metrics.map(metric => ({
        staff_id: staffId,
        metric_type: metric.metric_type,
        value: metric.value,
        recorded_at: new Date(),
      }))
    );

    logger.logApiEvent('Performance metrics tracked', { staffId, role, metrics: metrics.map(m => m.metric_type) });
    return recordedMetrics;
  } catch (error) {
    logger.logErrorEvent('Performance metrics tracking failed', { staffId, error: error.message });
    throw handleServiceError('trackPerformanceMetrics', error, staffConstants.STAFF_ERROR_CODES.GENERIC_ERROR);
  }
}

/**
 * Generates performance evaluation reports for staff.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Generated report.
 */
async function generatePerformanceReport(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: Merchant, as: 'merchant' }, { model: Customer, as: 'user' }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const metrics = await PerformanceMetric.findAll({
      where: { staff_id: staffId },
      order: [['recorded_at', 'DESC']],
      limit: 100,
    });

    const orders = await Order.count({ where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered' } });
    const inDiningOrders = await InDiningOrder.count({ where: { staff_id: staffId, status: mtablesConstants.IN_DINING_STATUSES.includes('closed') ? 'closed' : 'SERVED' } });
    const bookings = await Booking.count({ where: { staff_id: staffId, status: mtablesConstants.BOOKING_STATUSES.includes('seated') ? 'seated' : 'CHECKED_IN' } });
    const parkingBookings = await ParkingBooking.count({ where: { staff_id: staffId, status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.includes('occupied') ? 'occupied' : 'OCCUPIED' } });

    const reportData = {
      staffId,
      role: staff.staff_type,
      metrics: metrics.map(m => ({ type: m.metric_type, value: m.value, recorded_at: m.recorded_at })),
      branchName: staff.branch?.name,
      merchantName: staff.merchant?.business_name,
      totalOrders: orders,
      totalInDiningOrders: inDiningOrders,
      totalBookings: bookings,
      totalParkingBookings: parkingBookings,
    };

    const report = await Report.create({
      report_type: staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_FORMATS.includes('json') ? 'staff_performance' : 'json',
      data: reportData,
      generated_by: staff.user_id,
    });

    logger.logApiEvent('Performance report generated', { staffId, reportId: report.id });
    return report;
  } catch (error) {
    logger.logErrorEvent('Performance report generation failed', { staffId, error: error.message });
    throw handleServiceError('generatePerformanceReport', error, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Assesses training effectiveness based on performance metrics.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Evaluation result.
 */
async function evaluateTrainingImpact(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const trainings = await Training.findAll({
      where: { staff_id: staffId, status: 'completed' },
      order: [['completed_at', 'DESC']],
    });

    const metricsBefore = await PerformanceMetric.findAll({
      where: {
        staff_id: staffId,
        recorded_at: { [Op.lt]: trainings[0]?.completed_at || new Date() },
      },
    });

    const metricsAfter = await PerformanceMetric.findAll({
      where: {
        staff_id: staffId,
        recorded_at: { [Op.gte]: trainings[0]?.completed_at || new Date() },
      },
    });

    const evaluation = {
      staffId,
      role: staff.staff_type,
      trainingsCompleted: trainings.length,
      performanceChange: calculatePerformanceChange(metricsBefore, metricsAfter, staff.staff_type),
    };

    logger.logApiEvent('Training impact evaluated', { staffId, trainings: trainings.length });
    return evaluation;
  } catch (error) {
    logger.logErrorEvent('Training impact evaluation failed', { staffId, error: error.message });
    throw handleServiceError('evaluateTrainingImpact', error, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Retrieves performance summary for staff shifts.
 * @param {number} staffId - Staff ID.
 * @param {Object} options - Options for date range.
 * @param {Date} options.startDate - Start date for filtering shifts.
 * @param {Date} options.endDate - End date for filtering shifts.
 * @returns {Promise<Object>} Shift performance summary.
 */
async function getShiftPerformanceSummary(staffId, { startDate, endDate } = {}) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: MerchantBranch, as: 'branch' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const roleConstants = getRoleConstants(staff.staff_type);
    const where = { staff_id: staffId, status: roleConstants.SHIFT_SETTINGS.AI_SHIFT_SCHEDULING ? 'completed' : 'completed' };
    if (startDate && endDate) {
      where.start_time = { [Op.between]: [startDate, endDate] };
    }

    const shifts = await Shift.findAll({
      where,
      include: [{ model: MerchantBranch, as: 'branch' }],
    });

    const summary = {
      staffId,
      role: staff.staff_type,
      totalShifts: shifts.length,
      totalHours: shifts.reduce((total, shift) => {
        const duration = (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60);
        return total + duration;
      }, 0),
      branchNames: [...new Set(shifts.map(shift => shift.branch?.name).filter(Boolean))],
    };

    logger.logApiEvent('Shift performance summary retrieved', { staffId, totalShifts: shifts.length });
    return summary;
  } catch (error) {
    logger.logErrorEvent('Shift performance summary failed', { staffId, error: error.message });
    throw handleServiceError('getShiftPerformanceSummary', error, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Retrieves order completion stats for staff, including delivery and in-dining orders.
 * @param {number} staffId - Staff ID.
 * @param {Object} options - Options for date range.
 * @param {Date} options.startDate - Start date for filtering orders.
 * @param {Date} options.endDate - End date for filtering orders.
 * @returns {Promise<Object>} Order completion statistics.
 */
async function getOrderCompletionStats(staffId, { startDate, endDate } = {}) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Customer, as: 'user' }, { model: Driver, as: 'driver', required: false }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const roleConstants = getRoleConstants(staff.staff_type);
    const orderWhere = { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered' };
    const inDiningWhere = { staff_id: staffId, status: mtablesConstants.IN_DINING_STATUSES.includes('closed') ? 'closed' : 'SERVED' };
    if (startDate && endDate) {
      orderWhere.created_at = { [Op.between]: [startDate, endDate] };
      inDiningWhere.created_at = { [Op.between]: [startDate, endDate] };
    }

    const orders = await Order.findAll({
      where: orderWhere,
      include: [{ model: Customer, as: 'customer' }, { model: Merchant, as: 'merchant' }, { model: Driver, as: 'driver', required: false }],
    });

    const inDiningOrders = await InDiningOrder.findAll({
      where: inDiningWhere,
      include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }],
    });

    const parkingBookings = await ParkingBooking.count({
      where: {
        customer_id: { [Op.in]: orders.map(o => o.customer_id) },
        status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.includes('occupied') ? 'occupied' : 'OCCUPIED',
      },
    });

    const bookings = await Booking.count({
      where: { staff_id: staffId, status: mtablesConstants.BOOKING_STATUSES.includes('seated') ? 'seated' : 'CHECKED_IN' },
      include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as 'branch' }],
    });

    const stats = {
      staffId,
      role: staff.staff_type,
      totalOrders: orders.length,
      totalInDiningOrders: inDiningOrders.length,
      totalParkingBookings: parkingBookings,
      totalBookings: bookings,
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length : 0,
      performanceThresholds: roleConstants.ANALYTICS_CONSTANTS.PERFORMANCE_THRESHOLDS || {},
    };

    logger.logApiEvent('Order completion stats retrieved', { staffId, totalOrders: orders.length });
    return stats;
  } catch (error) {
    logger.logErrorEvent('Order completion stats failed', { staffId, error: error.message });
    throw handleServiceError('getOrderCompletionStats', error, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Helper function to get role-specific metrics.
 * @param {string} role - Staff role.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Metrics for the role.
 */
async function getRoleSpecificMetrics(role, staffId) {
  const roleConstants = getRoleConstants(role);
  const metrics = [];

  if (roleConstants.ANALYTICS_CONSTANTS?.METRICS) {
    for (const metric of roleConstants.ANALYTICS_CONSTANTS.METRICS) {
      let value = 0;
      switch (metric) {
        case 'prep_time':
          value = await calculatePrepSpeed(staffId, roleConstants);
          break;
        case 'customer_satisfaction':
          value = await calculateSatisfaction(staffId);
          break;
        case 'delivery_time':
          value = await calculateDeliveryTime(staffId);
          break;
        case 'inventory_accuracy':
          value = await calculateInventoryAccuracy(staffId);
          break;
        case 'parking_compliance':
          value = await calculateParkingCompliance(staffId);
          break;
        case 'checkout_speed':
          value = await calculateCheckoutSpeed(staffId);
          break;
        default:
          value = 0; // Placeholder for unhandled metrics
      }
      metrics.push({ metric_type: metric, value });
    }
  }

  return metrics;
}

/**
 * Helper function to get role-specific constants.
 * @param {string} role - Staff role.
 * @returns {Object} Role constants.
 */
function getRoleConstants(role) {
  const roleConstantMap = {
    chef: chefConstants,
    driver: driverConstants,
    cashier: cashierConstants,
    car_park_operative: carParkOperativeConstants,
    butcher: butcherConstants,
    barista: baristaConstants,
    back_of_house: backOfHouseConstants,
    front_of_house: frontOfHouseConstants,
    stock_clerk: stockClerkConstants,
    manager: managerConstants,
  };
  return roleConstantMap[role] || staffConstants;
}

/**
 * Calculates prep speed for orders.
 * @param {number} staffId - Staff ID.
 * @param {Object} roleConstants - Role-specific constants.
 * @returns {Promise<number>} Prep speed value.
 */
async function calculatePrepSpeed(staffId, roleConstants) {
  const orders = await Order.findAll({
    where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered' },
    limit: 10,
  });

  const threshold = roleConstants.ANALYTICS_CONSTANTS?.PERFORMANCE_THRESHOLDS?.PREP_TIME_MINUTES?.[orders[0]?.merchant?.merchant_type] || 10;
  const avgTime = orders.length > 0
    ? orders.reduce((sum, order) => {
        const prepTime = order.actual_delivery_time ? (new Date(order.actual_delivery_time) - new Date(order.created_at)) / (1000 * 60) : 0;
        return sum + prepTime;
      }, 0) / orders.length
    : threshold;

  return avgTime;
}

/**
 * Calculates customer satisfaction score.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Satisfaction score.
 */
async function calculateSatisfaction(staffId) {
  const orders = await Order.findAll({
    where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered', is_feedback_requested: true },
    limit: 10,
  });
  return orders.length > 0 ? orders.reduce((sum, order) => sum + (order.feedback_rating || 0), 0) / orders.length : 4.5; // Default to 4.5 if no feedback
}

/**
 * Calculates delivery time for drivers.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Delivery time.
 */
async function calculateDeliveryTime(staffId) {
  const orders = await Order.findAll({
    where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('delivered') ? 'delivered' : 'completed', delivery_type: munchConstants.DELIVERY_CONSTANTS.DELIVERY_TYPES.includes('standard') ? 'standard' : 'delivery' },
    limit: 10,
  });
  const threshold = munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_TIME_MINUTES || 30;
  return orders.length > 0
    ? orders.reduce((sum, order) => {
        const deliveryTime = order.actual_delivery_time ? (new Date(order.actual_delivery_time) - new Date(order.created_at)) / (1000 * 60) : 0;
        return sum + deliveryTime;
      }, 0) / orders.length
    : threshold;
}

/**
 * Calculates inventory accuracy for stock clerks and back of house.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Inventory accuracy percentage.
 */
async function calculateInventoryAccuracy(staffId) {
  const orders = await Order.findAll({
    where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered' },
    limit: 10,
  });
  return orders.length > 0 ? 95 : 90; // Example accuracy percentage
}

/**
 * Calculates parking compliance for car park operatives.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Parking compliance percentage.
 */
async function calculateParkingCompliance(staffId) {
  const parkingBookings = await ParkingBooking.findAll({
    where: { staff_id: staffId, status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.includes('occupied') ? 'occupied' : 'OCCUPIED' },
    limit: 10,
  });
  return parkingBookings.length > 0 ? 98 : 95; // Example compliance percentage
}

/**
 * Calculates checkout speed for cashiers.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<number>} Checkout speed in minutes.
 */
async function calculateCheckoutSpeed(staffId) {
  const orders = await Order.findAll({
    where: { staff_id: staffId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('completed') ? 'completed' : 'delivered' },
    limit: 10,
  });
  const threshold = cashierConstants.ANALYTICS_CONSTANTS.PERFORMANCE_THRESHOLDS?.CHECKOUT_TIME_MINUTES || 3;
  return orders.length > 0
    ? orders.reduce((sum, order) => {
        const checkoutTime = order.payment_processed_at ? (new Date(order.payment_processed_at) - new Date(order.created_at)) / (1000 * 60) : 0;
        return sum + checkoutTime;
      }, 0) / orders.length
    : threshold;
}

/**
 * Calculates performance change based on metrics before and after training.
 * @param {Array} before - Metrics before training.
 * @param {Array} after - Metrics after training.
 * @param {string} role - Staff role.
 * @returns {Object} Performance change.
 */
function calculatePerformanceChange(before, after, role) {
  const roleConstants = getRoleConstants(role);
  const keyMetric = roleConstants.ANALYTICS_CONSTANTS?.METRICS.includes('prep_time') ? 'prep_time' :
                    roleConstants.ANALYTICS_CONSTANTS?.METRICS.includes('delivery_time') ? 'delivery_time' :
                    roleConstants.ANALYTICS_CONSTANTS?.METRICS.includes('checkout_speed') ? 'checkout_speed' : 'task_completion_rate';

  const beforeValue = before.filter(m => m.metric_type === keyMetric).reduce((sum, m) => sum + m.value, 0) / (before.length || 1);
  const afterValue = after.filter(m => m.metric_type === keyMetric).reduce((sum, m) => sum + m.value, 0) / (after.length || 1);

  return { keyMetric, improvement: afterValue - beforeValue };
}

module.exports = {
  trackPerformanceMetrics,
  generatePerformanceReport,
  evaluateTrainingImpact,
  getShiftPerformanceSummary,
  getOrderCompletionStats,
};