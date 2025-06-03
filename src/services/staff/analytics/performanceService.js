'use strict';

/**
 * performanceService.js
 * Manages performance analytics for munch (staff role). Tracks metrics, generates reports,
 * evaluates training impact, and awards points.
 * Last Updated: May 25, 2025
 */

const { PerformanceMetric, Staff, Training, Report, GamificationPoints, BranchInsights, MerchantPerformanceMetrics } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Monitors prep speed and customer satisfaction metrics.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Recorded metrics.
 */
async function trackPerformanceMetrics(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const metrics = [
      {
        metric_type: staffConstants.STAFF_ANALYTICS_CONSTANTS.METRICS.PREP_SPEED,
        value: await calculatePrepSpeed(staffId), // Placeholder for prep speed logic
      },
      {
        metric_type: staffConstants.STAFF_ANALYTICS_CONSTANTS.METRICS.CUSTOMER_SATISFACTION,
        value: await calculateSatisfaction(staffId), // Placeholder for satisfaction logic
      },
    ];

    const recordedMetrics = await PerformanceMetric.bulkCreate(
      metrics.map(metric => ({
        staff_id: staffId,
        metric_type: metric.metric_type,
        value: metric.value,
        recorded_at: new Date(),
      }))
    );

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, action: 'track_metrics', metrics: metrics.length },
      ipAddress,
    });

    socketService.emit(`munch:performance:${staffId}`, 'performance:metrics_updated', {
      staffId,
      metrics: recordedMetrics.map(m => ({ type: m.metric_type, value: m.value })),
    });

    return recordedMetrics;
  } catch (error) {
    logger.error('Performance metrics tracking failed', { error: error.message, staffId });
    throw new AppError(`Metrics tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.GENERIC_ERROR);
  }
}

/**
 * Generates performance evaluation reports.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Generated report.
 */
async function generatePerformanceReport(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const metrics = await PerformanceMetric.findAll({
      where: { staff_id: staffId },
      order: [['recorded_at', 'DESC']],
      limit: 100,
    });

    const branchInsights = await BranchInsights.findOne({
      where: { branch_id: staff.branch_id },
      order: [['period_end', 'DESC']],
    });

    const reportData = {
      staffId,
      metrics: metrics.map(m => ({ type: m.metric_type, value: m.value, recorded_at: m.recorded_at })),
      branchPerformance: branchInsights?.performance_scores || {},
    };

    const encryptedData = await securityService.encryptData(reportData);
    const report = await Report.create({
      report_type: 'staff_performance',
      data: encryptedData,
      generated_by: staffId,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, reportId: report.id, action: 'generate_report' },
      ipAddress,
    });

    const message = localization.formatMessage('performance.report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANALYTICS,
      message,
      role: 'staff',
      module: 'munch',
      reportId: report.id,
    });

    socketService.emit(`munch:performance:${staffId}`, 'performance:report_generated', {
      staffId,
      reportId: report.id,
    });

    return report;
  } catch (error) {
    logger.error('Performance report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
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
      trainingsCompleted: trainings.length,
      performanceChange: calculatePerformanceChange(metricsBefore, metricsAfter), // Placeholder logic
    };

    socketService.emit(`munch:performance:${staffId}`, 'performance:training_evaluated', {
      staffId,
      trainingsCompleted: trainings.length,
    });

    return evaluation;
  } catch (error) {
    logger.error('Training impact evaluation failed', { error: error.message, staffId });
    throw new AppError(`Training evaluation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards points for performance improvement.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardPerformancePoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.PERFORMANCE_IMPROVEMENT.action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.PERFORMANCE_IMPROVEMENT.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.PERFORMANCE_IMPROVEMENT.points,
    });
  } catch (error) {
    logger.error('Performance points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

// Placeholder for prep speed calculation
async function calculatePrepSpeed(staffId) {
  // Implement logic to calculate average preparation time
  return 50; // Example value
}

// Placeholder for customer satisfaction calculation
async function calculateSatisfaction(staffId) {
  // Implement logic to calculate satisfaction score
  return 4.5; // Example value
}

// Placeholder for performance change calculation
function calculatePerformanceChange(before, after) {
  // Implement comparison logic
  return { improvement: 0 }; // Example
}

module.exports = {
  trackPerformanceMetrics,
  generatePerformanceReport,
  evaluateTrainingImpact,
  awardPerformancePoints,
};