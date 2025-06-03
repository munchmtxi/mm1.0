'use strict';

/**
 * driverAnalyticsService.js
 * Manages driver performance analytics for Munch merchant service.
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
  Driver,
  DriverRatings,
  Order,
  Route,
  Merchant,
  Notification,
  GamificationPoints,
  AuditLog,
} = require('@models');

/**
 * Tracks driver delivery times and ratings.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Driver metrics.
 */
async function monitorDriverMetrics(driverId, io) {
  try {
    if (!driverId) throw new Error('Driver ID required');

    const driver = await Driver.findByPk(driverId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!driver) throw new Error('Driver not found');

    const [orders, ratings, routes] = await Promise.all([
      Order.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['estimated_delivery_time', 'actual_delivery_time'],
      }),
      DriverRatings.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['rating'],
      }),
      Route.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        attributes: ['distance', 'duration'],
      }),
    ]);

    const avgDeliveryTime = orders.reduce((sum, o) => {
      if (o.estimated_delivery_time && o.actual_delivery_time) {
        return sum + (new Date(o.actual_delivery_time) - new Date(o.estimated_delivery_time)) / 1000 / 60;
      }
      return sum;
    }, 0) / orders.length || 0;

    const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / ratings.length : 0;
    const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0);

    const metrics = {
      avgDeliveryTime: avgDeliveryTime.toFixed(2),
      avgRating: avgRating.toFixed(2),
      totalDeliveries: orders.length,
      totalDistance: totalDistance.toFixed(2),
    };

    await Driver.update({ rating: avgRating }, { where: { id: driverId } });

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'monitor_driver_metrics',
      details: { driverId, metrics },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:driverMetricsMonitored', { driverId, metrics }, `driver:${driverId}`);

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: 'driver_metrics_monitored',
      messageKey: 'analytics.driver_metrics_monitored',
      messageParams: { totalDeliveries: metrics.totalDeliveries },
      role: 'driver',
      module: 'analytics',
      languageCode: driver.merchant?.preferred_language || 'en',
    });

    return metrics;
  } catch (error) {
    logger.error('Error monitoring driver metrics', { error: error.message });
    throw error;
  }
}

/**
 * Creates driver performance reports.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Performance report.
 */
async function generateDriverReports(driverId, io) {
  try {
    if (!driverId) throw new Error('Driver ID required');

    const driver = await Driver.findByPk(driverId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!driver) throw new Error('Driver not found');

    const [orders, ratings, routes] = await Promise.all([
      Order.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
      DriverRatings.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
      Route.findAll({
        where: { driver_id: driverId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      }),
    ]);

    const totalDeliveries = orders.length;
    const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / ratings.length : 0;
    const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0);

    const report = {
      driverId,
      driverName: driver.name,
      totalDeliveries,
      avgRating: avgRating.toFixed(2),
      totalDistance: totalDistance.toFixed(2),
      avgDeliveryTime: orders.reduce((sum, o) => {
        if (o.estimated_delivery_time && o.actual_delivery_time) {
          return sum + (new Date(o.actual_delivery_time) - new Date(o.estimated_delivery_time)) / 1000 / 60;
        }
        return sum;
      }, 0) / orders.length || 0,
    };

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'generate_driver_report',
      details: { driverId, totalDeliveries },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:driverReportGenerated', { driverId, totalDeliveries }, `driver:${driverId}`);

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: 'driver_performance_report',
      messageKey: 'analytics.driver_performance_report',
      messageParams: { totalDeliveries },
      role: 'driver',
      module: 'analytics',
      languageCode: driver.merchant?.preferred_language || 'en',
    });

    return report;
  } catch (error) {
    logger.error('Error generating driver report', { error: error.message });
    throw error;
  }
}

/**
 * Shares delivery feedback with driver.
 * @param {number} driverId - Driver ID.
 * @param {Object} feedback - Feedback details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Feedback result.
 */
async function provideDriverFeedback(driverId, feedback, io) {
  try {
    if (!driverId || !feedback) throw new Error('Driver ID and feedback required');

    const driver = await Driver.findByPk(driverId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!driver) throw new Error('Driver not found');

    await Notification.create({
      user_id: driver.user_id,
      type: 'driver_performance_feedback',
      message: feedback.message,
      status: 'sent',
      language_code: driver.merchant?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'provide_driver_feedback',
      details: { driverId, feedback },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:driverFeedbackProvided', { driverId, feedback }, `driver:${driverId}`);

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: 'driver_feedback_provided',
      messageKey: 'analytics.driver_feedback_provided',
      messageParams: { message: feedback.message },
      role: 'driver',
      module: 'analytics',
      languageCode: driver.merchant?.preferred_language || 'en',
    });

    return { status: 'Feedback sent' };
  } catch (error) {
    logger.error('Error providing driver feedback', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for driver performance.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackDriverGamification(driverId, io) {
  try {
    if (!driverId) throw new Error('Driver ID required');

    const driver = await Driver.findByPk(driverId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!driver) throw new Error('Driver not found');

    const points = await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: 'driver_performance_engagement',
      languageCode: driver.merchant?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'track_driver_gamification',
      details: { driverId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:driverPointsAwarded', { driverId, points: points.points }, `driver:${driverId}`);

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: 'driver_points_awarded',
      messageKey: 'analytics.driver_points_awarded',
      messageParams: { points: points.points },
      role: 'driver',
      module: 'analytics',
      languageCode: driver.merchant?.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking driver gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  monitorDriverMetrics,
  generateDriverReports,
  provideDriverFeedback,
  trackDriverGamification,
};