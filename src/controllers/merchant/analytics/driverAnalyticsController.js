'use strict';

const { sequelize } = require('@models');
const driverAnalyticsService = require('@services/merchant/analytics/driverAnalyticsService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const monitorDriverMetrics = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverAnalyticsService.monitorDriverMetrics(driverId, ipAddress, transaction);
    const pointsResult = await driverAnalyticsService.calculateDriverAnalyticsPoints(driverId, result.action, {
      totalDeliveries: result.metrics.totalDeliveries,
    });

    await notificationService.sendNotification(
      {
        userId: driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.driverMetricsMonitored',
        messageParams: { totalDeliveries: result.metrics.totalDeliveries },
        priority: 'MEDIUM',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(driverId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points: pointsResult.points, action: result.action },
          priority: 'LOW',
          role: pointsResult.role,
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: pointsResult.role,
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { driverId, action: 'driverMetricsMonitored', points: pointsResult.points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:driverMetricsMonitored', { driverId, points: pointsResult.points }, `driver:${driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const generateDriverReports = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverAnalyticsService.generateDriverReports(driverId, ipAddress, transaction);
    const pointsResult = await driverAnalyticsService.calculateDriverAnalyticsPoints(driverId, result.action, {
      avgRating: parseFloat(result.report.avgRating),
    });

    await notificationService.sendNotification(
      {
        userId: driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.driverReportGenerated',
        messageParams: { totalDeliveries: result.report.totalDeliveries },
        priority: 'MEDIUM',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(driverId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points: pointsResult.points, action: result.action },
          priority: 'LOW',
          role: pointsResult.role,
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: pointsResult.role,
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { driverId, action: 'driverReportGenerated', points: pointsResult.points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:driverReportGenerated', { driverId, totalDeliveries: result.report.totalDeliveries, points: pointsResult.points }, `driver:${driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const provideDriverFeedback = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { feedback } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverAnalyticsService.provideDriverFeedback(driverId, feedback, ipAddress, transaction);
    const pointsResult = await driverAnalyticsService.calculateDriverAnalyticsPoints(driverId, result.action, {
      feedbackLength: feedback.message.length,
    });

    await notificationService.sendNotification(
      {
        userId: driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.driverFeedbackProvided',
        messageParams: { message: feedback.message },
        priority: 'MEDIUM',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(driverId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'analytics.pointsAwarded',
          messageParams: { points: pointsResult.points, action: result.action },
          priority: 'LOW',
          role: pointsResult.role,
          module: 'analytics',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: pointsResult.role,
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { driverId, action: 'driverFeedbackProvided', points: pointsResult.points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:driverFeedbackProvided', { driverId, feedback: result.feedback, points: pointsResult.points }, `driver:${driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { monitorDriverMetrics, generateDriverReports, provideDriverFeedback };