'use strict';

/**
 * staffPerformanceService.js
 * Manages staff performance analytics for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const {
  Staff,
  Feedback,
  Order,
  InDiningOrder,
  Booking,
  MerchantBranch,
  Merchant,
  Notification,
  GamificationPoints,
  AuditLog,
} = require('@models');

/**
 * Tracks staff preparation speed and customer satisfaction.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Staff metrics.
 */
async function monitorStaffMetrics(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) throw new Error('Staff not found');

    const [orders, inDiningOrders, bookings, feedback] = await Promise.all([
      Order.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['created_at', 'actual_delivery_time'],
      }),
      InDiningOrder.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['created_at', 'estimated_completion_time'],
      }),
      Booking.count({ where: { staff_id: staffId, status: 'seated', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } }),
      Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['rating'],
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
      tasksCompleted: orders.length + inDiningOrders.length + bookings,
    };

    await Staff.update({ performance_metrics: metrics }, { where: { id: staffId } });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'monitor_staff_metrics',
      details: { staffId, metrics },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:staffMetricsMonitored', { staffId, metrics }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: 'staff_metrics_monitored',
      messageKey: 'analytics.staff_metrics_monitored',
      messageParams: { tasksCompleted: metrics.tasksCompleted },
      role: 'staff',
      module: 'analytics',
      languageCode: staff.merchant.preferred_language || 'en',
    });

    return metrics;
  } catch (error) {
    logger.error('Error monitoring staff metrics', { error: error.message });
    throw error;
  }
}

/**
 * Creates staff performance evaluation reports.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Performance report.
 */
async function generatePerformanceReports(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: MerchantBranch, as: 'branch' }, { model: Merchant, as: 'merchant' }] });
    if (!staff) throw new Error('Staff not found');

    const [orders, inDiningOrders, bookings, feedback] = await Promise.all([
      Order.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
      InDiningOrder.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
      Booking.findAll({
        where: { staff_id: staffId, status: 'seated', created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
      Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
    ]);

    const totalTasks = orders.length + inDiningOrders.length + bookings.length;
    const avgRating = feedback.length ? feedback.reduce((sum, f) => sum + parseFloat(f.rating), 0) / feedback.length : 0;
    const report = {
      staffId,
      staffName: staff.user_id, // Adjust if User model has name
      branchName: staff.branch?.name,
      totalTasks,
      avgRating: avgRating.toFixed(2),
      taskBreakdown: { orders: orders.length, inDiningOrders: inDiningOrders.length, bookings: bookings.length },
    };

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'generate_staff_performance_report',
      details: { staffId, totalTasks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:staffReportGenerated', { staffId, totalTasks }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: 'staff_performance_report',
      messageKey: 'analytics.staff_performance_report',
      messageParams: { totalTasks },
      role: 'staff',
      module: 'analytics',
      languageCode: staff.merchant.preferred_language || 'en',
    });

    return report;
  } catch (error) {
    logger.error('Error generating staff performance report', { error: error.message });
    throw error;
  }
}

/**
 * Shares performance feedback with staff.
 * @param {number} staffId - Staff ID.
 * @param {Object} feedback - Feedback details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Feedback result.
 */
async function provideFeedback(staffId, feedback, io) {
  try {
    if (!staffId || !feedback) throw new Error('Staff ID and feedback required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) throw new Error('Staff not found');

    await Notification.create({
      user_id: staff.user_id,
      type: 'staff_performance_feedback',
      message: feedback.message,
      status: 'sent',
      language_code: staff.merchant.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'provide_staff_feedback',
      details: { staffId, feedback },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:staffFeedbackProvided', { staffId, feedback }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: 'staff_feedback_provided',
      messageKey: 'analytics.staff_feedback_provided',
      messageParams: { message: feedback.message },
      role: 'staff',
      module: 'analytics',
      languageCode: staff.merchant.preferred_language || 'en',
    });

    return { status: 'Feedback sent' };
  } catch (error) {
    logger.error('Error providing staff feedback', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for staff performance.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackStaffGamification(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) throw new Error('Staff not found');

    const points = await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      action: 'staff_performance_engagement',
      languageCode: staff.merchant.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'track_staff_gamification',
      details: { staffId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:staffPointsAwarded', { staffId, points: points.points }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: 'staff_points_awarded',
      messageKey: 'analytics.staff_points_awarded',
      messageParams: { points: points.points },
      role: 'staff',
      module: 'analytics',
      languageCode: staff.merchant.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking staff gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  monitorStaffMetrics,
  generatePerformanceReports,
  provideFeedback,
  trackStaffGamification,
};