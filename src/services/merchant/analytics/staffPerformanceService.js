'use strict';

const { Op } = require('sequelize');
const { Staff, Feedback, Order, InDiningOrder, Booking, MerchantBranch, Merchant, BranchStaffRole, ParkingBooking } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const chefConstants = require('@constants/staff/chefConstants');
const driverConstants = require('@constants/staff/driverConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const managerConstants = require('@constants/staff/managerConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

const roleConstantsMap = {
  chef: chefConstants,
  driver: driverConstants,
  cashier: cashierConstants,
  car_park_operative: carParkOperativeConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
  back_of_house: backOfHouseConstants,
  front_of_house: frontOfHouseConstants,
  manager: managerConstants,
  stock_clerk: stockClerkConstants,
};

async function monitorStaffMetrics(staffId, ipAddress, transaction = null) {
  try {
    if (!staffId) {
      throw new AppError('Invalid staff ID', 400, staffConstants.STAFF_ERROR_CODES[0]); // INVALID_STAFF_TYPE
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant', attributes: ['preferred_language'] }],
      attributes: ['id', 'user_id', 'staff_types', 'certifications'],
      transaction,
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES[1]); // STAFF_NOT_FOUND
    }

    // Validate staff types
    const validStaffTypes = staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES;
    if (!staff.staff_types.every(type => validStaffTypes.includes(type))) {
      throw new AppError('Invalid staff types', 400, staffConstants.STAFF_ERROR_CODES[0]); // INVALID_STAFF_TYPE
    }

    // Validate certifications for each staff type
    for (const type of staff.staff_types) {
      const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
      if (!requiredCerts.every(cert => staff.certifications?.includes(cert))) {
        throw new AppError('Missing required certifications', 400, staffConstants.STAFF_ERROR_CODES[13]); // MISSING_CERTIFICATIONS
      }
    }

    // Determine applicable performance threshold based on staff type
    let prepTimeThreshold = staffConstants.STAFF_ANALYTICS_CONSTANTS.PERFORMANCE_THRESHOLDS.PREP_TIME_MINUTES.restaurant;
    const primaryRole = staff.staff_types[0]; // Assume first role for simplicity
    const roleConstants = roleConstantsMap[primaryRole];
    if (roleConstants && roleConstants.ANALYTICS_CONSTANTS) {
      const merchantType = staff.merchant?.type || 'restaurant';
      prepTimeThreshold = staffConstants.STAFF_ANALYTICS_CONSTANTS.PERFORMANCE_THRESHOLDS.PREP_TIME_MINUTES[merchantType] || prepTimeThreshold;
    }

    const [orders, inDiningOrders, bookings, feedback, parkingBookings] = await Promise.all([
      Order.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['created_at', 'actual_delivery_time'],
        transaction,
      }),
      InDiningOrder.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['created_at', 'estimated_completion_time'],
        transaction,
      }),
      Booking.count({
        where: { staff_id: staffId, status: 'seated', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
      Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['rating'],
        transaction,
      }),
      ParkingBooking.count({
        where: { staff_id: staffId, status: 'COMPLETED', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
    ]);

    const avgPrepTime = [...orders, ...inDiningOrders].reduce((sum, o) => {
      const endTime = o.actual_delivery_time || o.estimated_completion_time;
      if (endTime) {
        return sum + (new Date(endTime) - new Date(o.created_at)) / 1000 / 60;
      }
      return sum;
    }, 0) / (orders.length + inDiningOrders.length) || 0;

    const avgRating = feedback.length ? feedback.reduce((sum, f) => sum + parseFloat(f.rating), 0) / feedback.length : 0;

    const metrics = {
      avgPrepTime: avgPrepTime.toFixed(2),
      avgRating: avgRating.toFixed(2),
      tasksCompleted: orders.length + inDiningOrders.length + bookings + parkingBookings,
      taskCompletionRate: ((orders.length + inDiningOrders.length + bookings + parkingBookings) / prepTimeThreshold * 100).toFixed(2),
    };

    await Staff.update({ performance_metrics: metrics }, { where: { id: staffId }, transaction });

    logger.info(`Staff metrics monitored for staff ${staffId}`);
    return {
      staffId,
      metrics,
      language: staff.merchant?.preferred_language || 'en',
      action: staffConstants.SUCCESS_MESSAGES[0], // staff_onboarded
    };
  } catch (error) {
    throw handleServiceError('monitorStaffMetrics', error, staffConstants.STAFF_ERROR_CODES[2]); // SYSTEM_ERROR
  }
}

async function generatePerformanceReports(staffId, ipAddress, transaction = null) {
  try {
    if (!staffId) {
      throw new AppError('Invalid staff ID', 400, staffConstants.STAFF_ERROR_CODES[0]); // INVALID_STAFF_TYPE
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: MerchantBranch, as: 'branch', attributes: ['name'] },
        { model: Merchant, as: 'merchant', attributes: ['preferred_language'] },
        { model: BranchStaffRole, as: 'staffRoles', attributes: ['role_id'] },
      ],
      attributes: ['id', 'user_id', 'staff_types', 'certifications'],
      transaction,
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES[1]); // STAFF_NOT_FOUND
    }

    // Validate staff types
    const validStaffTypes = staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES;
    if (!staff.staff_types.every(type => validStaffTypes.includes(type))) {
      throw new AppError('Invalid staff types', 400, staffConstants.STAFF_ERROR_CODES[0]); // INVALID_STAFF_TYPE
    }

    // Validate certifications
    for (const type of staff.staff_types) {
      const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
      if (!requiredCerts.every(cert => staff.certifications?.includes(cert))) {
        throw new AppError('Missing required certifications', 400, staffConstants.STAFF_ERROR_CODES[13]); // MISSING_CERTIFICATIONS
      }
    }

    const [orders, inDiningOrders, bookings, feedback, parkingBookings] = await Promise.all([
      Order.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        transaction,
      }),
      InDiningOrder.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        transaction,
      }),
      Booking.findAll({
        where: { staff_id: staffId, status: 'seated', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        transaction,
      }),
      Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        transaction,
      }),
      ParkingBooking.findAll({
        where: { staff_id: staffId, status: 'COMPLETED', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        transaction,
      }),
    ]);

    const totalTasks = orders.length + inDiningOrders.length + bookings.length + parkingBookings.length;
    const avgRating = feedback.length ? feedback.reduce((sum, f) => sum + parseFloat(f.rating), 0) / feedback.length : 0;

    const report = {
      staffId,
      staffName: staff.user_id, // Adjust if User model has name
      branchName: staff.branch?.name || 'N/A',
      staffTypes: staff.staff_types,
      totalTasks,
      avgRating: avgRating.toFixed(2),
      taskBreakdown: {
        orders: orders.length,
        inDiningOrders: inDiningOrders.length,
        bookings: bookings.length,
        parkingBookings: parkingBookings.length,
      },
    };

    logger.info(`Performance report generated for staff ${staffId}`);
    return {
      staffId,
      report,
      language: staff.merchant?.preferred_language || 'en',
      action: staffConstants.SUCCESS_MESSAGES[2], // payment_processed
    };
  } catch (error) {
    throw handleServiceError('generatePerformanceReports', error, staffConstants.STAFF_ERROR_CODES[2]); // SYSTEM_ERROR
  }
}

async function provideFeedback(staffId, feedback, ipAddress, transaction = null) {
  try {
    if (!staffId || !feedback?.message || !feedback?.rating) {
      throw new AppError('Invalid feedback data', 400, staffConstants.STAFF_ERROR_CODES[4]); // INVALID_FEEDBACK
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant', attributes: ['preferred_language'] }],
      attributes: ['id', 'user_id', 'staff_types', 'certifications'],
      transaction,
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES[1]); // STAFF_NOT_FOUND
    }

    // Validate staff types
    const validStaffTypes = staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES;
    if (!staff.staff_types.every(type => validStaffTypes.includes(type))) {
      throw new AppError('Invalid staff types', 400, staffConstants.STAFF_ERROR_CODES[0]); // INVALID_STAFF_TYPE
    }

    // Validate certifications
    for (const type of staff.staff_types) {
      const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || [];
      if (!requiredCerts.every(cert => staff.certifications?.includes(cert))) {
        throw new AppError('Missing required certifications', 400, staffConstants.STAFF_ERROR_CODES[13]); // MISSING_CERTIFICATIONS
      }
    }

    // Validate rating
    if (feedback.rating < 1 || feedback.rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, staffConstants.STAFF_ERROR_CODES[4]); // INVALID_FEEDBACK
    }

    logger.info(`Feedback validated for staff ${staffId}`);
    return {
      staffId,
      feedback: { message: feedback.message, rating: feedback.rating },
      language: staff.merchant?.preferred_language || 'en',
      action: staffConstants.SUCCESS_MESSAGES[3], // withdrawal_requested
    };
  } catch (error) {
    throw handleServiceError('provideFeedback', error, staffConstants.STAFF_ERROR_CODES[2]); // SYSTEM_ERROR
  }
}

module.exports = {
  monitorStaffMetrics,
  generatePerformanceReports,
  provideFeedback,
};