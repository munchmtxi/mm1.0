'use strict';

const { sequelize } = require('@models');
const staffPerformanceService = require('@services/merchant/analytics/staffPerformanceService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role = 'merchant') => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'staffMetricsMonitored' && metadata.tasksCompleted) {
    multipliers *= actionConfig.multipliers.tasksCompleted * metadata.tasksCompleted || 1;
  }
  if (action === 'staffReportGenerated' && metadata.totalTasks) {
    multipliers *= actionConfig.multipliers.totalTasks * metadata.totalTasks || 1;
  }
  if (action === 'staffFeedbackProvided' && metadata.feedbackLength) {
    multipliers *= actionConfig.multipliers.feedbackLength * metadata.feedbackLength || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const monitorStaffMetrics = catchAsync(async (req, res) => {
  const { staffId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await staffPerformanceService.monitorStaffMetrics(staffId, ipAddress, transaction);
    const points = calculatePoints(result.action, { tasksCompleted: result.metrics.tasksCompleted }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: staffId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.staffMetricsMonitored',
        messageParams: { tasksCompleted: result.metrics.tasksCompleted },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(staffId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { tasksCompleted: result.metrics.tasksCompleted },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: staffId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: staffId,
        role: 'merchant',
        action: 'monitor_staff_metrics',
        details: { staffId, action: 'staffMetricsMonitored', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:staffMetricsMonitored', { staffId, tasksCompleted: result.metrics.tasksCompleted, points }, `staff:${staffId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const generatePerformanceReports = catchAsync(async (req, res) => {
  const { staffId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await staffPerformanceService.generatePerformanceReports(staffId, ipAddress, transaction);
    const points = calculatePoints(result.action, { totalTasks: result.report.totalTasks }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: staffId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.staffReportGenerated',
        messageParams: { totalTasks: result.report.totalTasks },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(staffId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { totalTasks: result.report.totalTasks },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: staffId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: staffId,
        role: 'merchant',
        action: 'generate_staff_performance_report',
        details: { staffId, action: 'staffReportGenerated', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:staffReportGenerated', { staffId, totalTasks: result.report.totalTasks, points }, `staff:${staffId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const provideFeedback = catchAsync(async (req, res) => {
  const { staffId } = req.params;
  const { feedback } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await staffPerformanceService.provideFeedback(staffId, feedback, ipAddress, transaction);
    const points = calculatePoints(result.action, { feedbackLength: result.feedback.message.length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: staffId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.staffFeedbackProvided',
        messageParams: { message: result.feedback.message },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(staffId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { feedbackLength: result.feedback.message.length },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: staffId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: staffId,
        role: 'merchant',
        action: 'provide_staff_feedback',
        details: { staffId, action: 'staffFeedbackProvided', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:staffFeedbackProvided', { staffId, feedback: result.feedback, points }, `staff:${staffId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { monitorStaffMetrics, generatePerformanceReports, provideFeedback };