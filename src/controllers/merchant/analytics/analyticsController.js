'use strict';

const { sequelize } = require('@models');
const analyticsService = require('@services/merchant/analytics/customerAnalyticsService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const trackCustomerBehavior = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.trackCustomerBehavior(customerId, ipAddress, transaction);
    const pointsResult = await analyticsService.calculateAnalyticsPoints(customerId, result.action, {
      orders: result.behavior.orders,
      bookings: result.behavior.bookings,
    });

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      messageKey: 'analytics.behaviorTracked',
      messageParams: { orderCount: result.behavior.orders },
      priority: 'MEDIUM',
      role: pointsResult.role,
      module: 'analytics',
      languageCode: result.language,
    }, transaction);

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(customerId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.pointsAwarded',
        messageParams: { points: pointsResult.points, action: result.action },
        priority: 'LOW',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      }, transaction);
    }

    await auditService.logAction({
      userId: customerId,
      role: pointsResult.role,
      action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
      details: { customerId, action: 'behaviorTracked', points: pointsResult.points },
      ipAddress,
    }, transaction);

    await socketService.emit(io, 'merchant:analytics:behaviorTracked', { customerId, points: pointsResult.points }, `merchant:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const analyzeSpendingTrends = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.analyzeSpendingTrends(customerId, ipAddress, transaction);
    const pointsResult = await analyticsService.calculateAnalyticsPoints(customerId, result.action, {
      totalSpent: result.trends.totalSpent,
    });

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      messageKey: 'analytics.spendingTrendsAnalyzed',
      messageParams: { totalSpent: result.trends.totalSpent },
      priority: 'MEDIUM',
      role: pointsResult.role,
      module: 'analytics',
      languageCode: result.language,
    }, transaction);

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(customerId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.pointsAwarded',
        messageParams: { points: pointsResult.points, action: result.action },
        priority: 'LOW',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      }, transaction);
    }

    await auditService.logAction({
      userId: customerId,
      role: pointsResult.role,
      action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
      details: { customerId, action: 'spendingTrendsAnalyzed', points: pointsResult.points },
      ipAddress,
    }, transaction);

    await socketService.emit(io, 'merchant:analytics:spendingTrendsAnalyzed', { customerId, totalSpent: result.trends.totalSpent, points: pointsResult.points }, `merchant:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const provideRecommendations = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.provideRecommendations(customerId, ipAddress, transaction);
    const pointsResult = await analyticsService.calculateAnalyticsPoints(customerId, result.action, result.metadata);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      messageKey: 'analytics.recommendationsProvided',
      messageParams: { itemCount: result.recommendations.length },
      priority: 'MEDIUM',
      role: pointsResult.role,
      module: 'analytics',
      languageCode: result.language,
    }, transaction);

    if (pointsResult.points > 0) {
      await gamificationService.awardPoints(customerId, result.action, pointsResult.points, {
        io,
        role: pointsResult.role,
        languageCode: result.language,
        metadata: pointsResult.metadata,
      }, transaction);

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.pointsAwarded',
        messageParams: { points: pointsResult.points, action: result.action },
        priority: 'LOW',
        role: pointsResult.role,
        module: 'analytics',
        languageCode: result.language,
      }, transaction);
    }

    await auditService.logAction({
      userId: customerId,
      role: pointsResult.role,
      action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
      details: { customerId, action: 'recommendationsProvided', points: pointsResult.points },
      ipAddress,
    }, transaction);

    await socketService.emit(io, 'merchant:analytics:recommendationsProvided', { customerId, recommendationCount: result.recommendations.length, points: pointsResult.points }, `merchant:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points: pointsResult.points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { trackCustomerBehavior, analyzeSpendingTrends, provideRecommendations };