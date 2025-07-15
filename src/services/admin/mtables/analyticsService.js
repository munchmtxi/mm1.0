'use strict';

const { Op, sequelize } = require('sequelize');
const { Booking, Feedback, GamificationPoints, MerchantBranch, Customer } = require('@models');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function getBookingAnalytics(restaurantId, { pointService }) {
  try {
    if (!restaurantId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      ],
      group: ['status'],
    });

    const totalBookings = bookings.reduce((sum, b) => sum + parseInt(b.get('total')), 0);
    const completionRate = totalBookings
      ? (bookings.find(b => b.status === mtablesConstants.BOOKING_STATUSES.COMPLETED)?.get('total') || 0) / totalBookings * 100
      : 0;

    const analytics = {
      totalBookings,
      completionRate: parseFloat(completionRate.toFixed(2)),
      byStatus: bookings.map(b => ({
        status: b.status,
        count: parseInt(b.get('total')),
        percentage: totalBookings ? (parseInt(b.get('total')) / totalBookings * 100).toFixed(2) : 0,
      })),
    };

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.bookingTrendsAnalyzed,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.points,
    });

    logger.info('Booking analytics retrieved', { restaurantId });
    return analytics;
  } catch (error) {
    logger.logErrorEvent(`getBookingAnalytics failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function exportBookingReports(restaurantId, { pointService }) {
  try {
    if (!restaurantId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: { branch_id: restaurantId },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'user_id'],
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['name'],
            },
          ],
        },
        { model: Feedback, as: 'booking' },
      ],
      order: [['booking_date', 'DESC']],
    });

    const report = bookings.map(booking => ({
      bookingId: booking.id,
      customerId: booking.customer_id,
      customerName: booking.customer?.user?.name || 'Unknown',
      date: booking.format_date(),
      time: booking.format_time(),
      guestCount: booking.guest_count,
      status: booking.status,
      feedbackRating: booking.booking?.rating || null,
      feedbackComment: booking.booking?.comment || null,
    }));

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.reportGenerated,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.FINANCIAL_REPORT.points,
    });

    logger.info('Booking report generated', { restaurantId, reportCount: report.length });
    return report;
  } catch (error) {
    logger.logErrorEvent(`exportBookingReports failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function analyzeCustomerEngagement(restaurantId, { pointService }) {
  try {
    if (!restaurantId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: [{ model: Feedback, as: 'booking' }],
    });

    const totalBookings = bookings.length;
    const feedbackCount = bookings.filter(b => b.booking).length;
    const averageRating = feedbackCount
      ? bookings
          .filter(b => b.booking)
          .reduce((sum, b) => sum + b.booking.rating, 0) / feedbackCount
      : 0;
    const repeatCustomers = await Booking.count({
      where: { branch_id: restaurantId },
      attributes: ['customer_id'],
      group: ['customer_id'],
      having: sequelize.literal('COUNT(*) >= 2'),
    });

    const engagement = {
      totalBookings,
      feedbackRate: totalBookings ? (feedbackCount / totalBookings * 100).toFixed(1) : 0,
      averageRating: parseFloat(averageRating.toFixed(2)),
      repeatCustomerCount: repeatCustomers.length,
    };

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.engagementAnalyzed,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.points,
    });

    logger.info('Customer engagement analyzed', { restaurantId, engagement });
    return engagement;
  } catch (error) {
    logger.logErrorEvent(`analyzeCustomerEngagement failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

async function trackGamificationMetrics(restaurantId, { pointService }) {
  try {
    if (!restaurantId) {
      throw new AppError(
        formatMessage('error.invalid_booking_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        formatMessage('error.restaurant_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: { branch_id: restaurantId },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'user_id'] }],
    });

    const userIds = [...new Set(bookings.map(b => b.customer?.user_id).filter(id => id))];
    const points = await GamificationPoints.findAll({
      where: {
        user_id: { [Op.in]: userIds },
        role: 'customer',
        action: {
          [Op.in]: Object.values(mtablesConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS)
            .filter(a => a.roles?.includes('customer') || !a.roles)
            .map(a => a.action),
        },
        expires_at: { [Op.gte]: new Date() },
      },
    });

    const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
    const pointsByAction = points.reduce((acc, p) => {
      acc[p.action] = (acc[p.action] || 0) + p.points;
      return acc;
    }, {});

    const metrics = {
      totalPoints,
      pointsByAction,
      activeUsers: userIds.length,
    };

    await pointService.awardPoints({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.POINT_AWARD_ACTIONS.ANALYTICS_REVIEW,
      points: mtablesConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS.ANALYTICS_REVIEW.points,
    });

    logger.info('Gamification metrics tracked', { restaurantId, metrics });
    return metrics;
  } catch (error) {
    logger.logErrorEvent(`trackGamificationMetrics failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

module.exports = {
  getBookingAnalytics,
  exportBookingReports,
  analyzeCustomerEngagement,
  trackGamificationMetrics,
};