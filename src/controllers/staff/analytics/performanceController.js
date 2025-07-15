// performanceController.js
// Handles performance analytics requests for staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const performanceService = require('@services/staff/analytics/performanceService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff } = require('@models');

async function trackPerformanceMetrics(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const metrics = await performanceService.trackPerformanceMetrics(staffId);

    const staff = await Staff.findByPk(staffId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { staffId, action: 'track_metrics', metrics: metrics.length },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.performance_improvement.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.performance_improvement.points,
      details: { staffId, metrics: metrics.length },
    });

    socketService.emit(io, `staff:analytics:metrics_updated`, {
      staffId,
      metrics,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.metrics_tracked', { count: metrics.length }, staff.preferred_language || 'en'),
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}

async function generatePerformanceReport(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const report = await performanceService.generatePerformanceReport(staffId);

    const staff = await Staff.findByPk(staffId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_retrieve,
      details: { staffId, reportId: report.id, action: 'generate_report' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { staffId, reportId: report.id },
    });

    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'analytics.report_generated',
      messageParams: { reportId: report.id },
      role: 'staff',
      module: 'analytics',
      languageCode: staff.preferred_language || 'en',
    });

    socketService.emit(io, `staff:analytics:report_generated`, {
      staffId,
      reportId: report.id,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.report_generated', { reportId: report.id }, staff.preferred_language || 'en'),
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function evaluateTrainingImpact(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const evaluation = await performanceService.evaluateTrainingImpact(staffId);

    const staff = await Staff.findByPk(staffId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_retrieve,
      details: { staffId, action: 'evaluate_training', trainingsCompleted: evaluation.trainingsCompleted },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { staffId, trainingsCompleted: evaluation.trainingsCompleted },
    });

    socketService.emit(io, `staff:analytics:training_evaluated`, {
      staffId,
      trainingsCompleted: evaluation.trainingsCompleted,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.training_evaluated', { count: evaluation.trainingsCompleted }, staff.preferred_language || 'en'),
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackPerformanceMetrics,
  generatePerformanceReport,
  evaluateTrainingImpact,
};