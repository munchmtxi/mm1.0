'use strict';

/**
 * performanceService.js
 * Manages staff performance metrics, reports, training, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const staffSystemConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const { Staff, Merchant, User, PerformanceMetric, Training, Notification, AuditLog, GamificationPoints } = require('@models');

/**
 * Tracks staff performance metrics.
 * @param {number} staffId - Staff ID.
 * @param {Object} metrics - Metrics data { metricType, value }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Metric details.
 */
async function monitorMetrics(staffId, metrics, io) {
  try {
    const { metricType, value } = metrics;
    if (!staffId || !metricType || value == null) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    if (!Object.values(staffSystemConstants.STAFF_ANALYTICS_CONSTANTS.METRICS).includes(metricType)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const metric = await PerformanceMetric.create({
      staff_id: staffId,
      metric_type: metricType,
      value,
      recorded_at: new Date(),
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, metricType, value },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:metricMonitored', { staffId, metricType, value }, `staff:${staffId}`);

    return metric;
  } catch (error) {
    logger.error('Error monitoring metrics', { error: error.message });
    throw error;
  }
}

/**
 * Generates performance reports.
 * @param {number} staffId - Staff ID.
 * @param {Object} options - Report options { period, format }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Report details.
 */
async function generatePerformanceReports(staffId, options, io) {
  try {
    const { period, format } = options;
    if (!staffId || !period || !format) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    if (!staffSystemConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }
    if (!staffSystemConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_FORMATS.includes(format)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const metrics = await PerformanceMetric.findAll({
      where: { staff_id: staffId },
      attributes: ['metric_type', 'value', 'recorded_at'],
      order: [['recorded_at', 'DESC']],
    });

    const report = { staffId, period, format, metrics };

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, period, format },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:performanceReport', { staffId, period, format }, `staff:${staffId}`);

    return report;
  } catch (error) {
    logger.error('Error generating performance report', { error: error.message });
    throw error;
  }
}

/**
 * Distributes training materials.
 * @param {number} staffId - Staff ID.
 * @param {Object} training - Training details { category, content }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Training details.
 */
async function distributeTraining(staffId, training, io) {
  try {
    const { category, content } = training;
    if (!staffId || !category || !content) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    if (!Object.keys(staffRolesConstants.STAFF_TRAINING_CATEGORIES).includes(category)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_CERTIFICATION);
    }

    const trainingRecord = await Training.create({
      staff_id: staffId,
      category,
      content,
      status: 'assigned',
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, category },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:trainingDistributed', { staffId, category }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TRAINING_REMINDER,
      messageKey: 'staff.training_assigned',
      messageParams: { category },
      role: 'staff',
      module: 'performance',
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    return trainingRecord;
  } catch (error) {
    logger.error('Error distributing training', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for performance improvements.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackPerformanceGamification(staffId, io) {
  try {
    if (!staffId) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const metrics = await PerformanceMetric.count({ where: { staff_id: staffId } });
    if (metrics === 0) throw new Error('No performance metrics found');

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.PERFORMANCE_IMPROVEMENT.action;

    const points = await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, points: points.points, action },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:performanceGamification', { staffId, points: points.points }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      messageKey: 'staff.performance_points_awarded',
      messageParams: { points: points.points },
      role: 'staff',
      module: 'performance',
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    return points;
  } catch (error) {
    logger.error('Error tracking performance gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  monitorMetrics,
  generatePerformanceReports,
  distributeTraining,
  trackPerformanceGamification,
};