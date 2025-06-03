'use strict';

/**
 * Analytics Service for mtables (Admin)
 * Provides analytics for booking completion rates, report generation, customer engagement,
 * and gamification metrics for a restaurant (merchant branch).
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Op, sequelize } = require('sequelize');
const { Booking, Feedback, GamificationPoints, MerchantBranch, Customer } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

/**
 * Retrieves booking completion rates for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Object>} Completion rates and statistics.
 */
async function getBookingAnalytics(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        'Restaurant ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'Restaurant not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
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

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, analyticsType: 'booking_completion' },
      ipAddress: 'unknown',
    });

    logger.info('Booking analytics retrieved', { restaurantId });
    return analytics;
  } catch (error) {
    logger.logErrorEvent(`getBookingAnalytics failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Generates booking reports for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Object>} Report data.
 */
async function exportBookingReports(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        'Restaurant ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'Restaurant not found',
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

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'analytics.report_generated',
      messageParams: { restaurantId, reportCount: report.length },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'analytics:report_generated', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      reportCount: report.length,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, reportCount: report.length },
      ipAddress: 'unknown',
    });

    logger.info('Booking report generated', { restaurantId, reportCount: report.length });
    return report;
  } catch (error) {
    logger.logErrorEvent(`exportBookingReports failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Tracks customer engagement for bookings at a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Object>} Engagement metrics.
 */
async function analyzeCustomerEngagement(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        'Restaurant ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'Restaurant not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: restaurantId,
        booking_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
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

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'analytics.engagement',
      messageParams: { restaurantId, feedbackRate: engagement.feedbackRate },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'analytics:engagement_completed', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      engagementMetrics: engagement,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, engagementMetrics: engagement },
      ipAddress: 'unknown',
    });

    logger.info('Customer engagement analyzed', { restaurantId, engagement });
    return engagement;
  } catch (error) {
    logger.logErrorEvent(`analyzeCustomerEngagement failed: ${error.message}`, { restaurantId });
    throw error;
  }
}

/**
 * Monitors gamification points for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @returns {Promise<Object>} Gamification metrics.
 */
async function trackGamificationMetrics(restaurantId) {
  try {
    if (!restaurantId) {
      throw new AppError(
        'Restaurant ID required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) {
      throw new AppError(
        'Restaurant not found',
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
          [Op.in]: Object.values(mtablesConstants.GAMIFICATION_ACTIONS)
            .filter(a => a.roles.includes('customer'))
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

    // Send notification
    await notificationService.sendNotification({
      userId: branch.merchant_id.toString(),
      notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_UPDATED,
      messageKey: 'analytics.gamification_tracked',
      messageParams: { restaurantId, totalPoints },
      role: 'merchant',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'analytics:gamification_tracked', {
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      restaurantId,
      gamificationMetrics: metrics,
    });

    // Log audit action
    await auditService.logAction({
      userId: branch.merchant_id.toString(),
      role: 'merchant',
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { restaurantId, gamificationMetrics: metrics },
      ipAddress: 'unknown',
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