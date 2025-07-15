'use strict';

const { sequelize } = require('@models');
const multiBranchAnalyticsService = require('@services/merchant/analytics/multiBranchAnalyticsService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'branchDataAggregated' && metadata.branchCount) {
    multipliers *= actionConfig.multipliers.branchCount * metadata.branchCount || 1;
  }
  if (action === 'branchPerformanceCompared' && metadata.performanceScore) {
    multipliers *= actionConfig.multipliers.performance * metadata.performanceScore || 1;
  }
  if (action === 'multiBranchReportsGenerated' && metadata.totalRevenue) {
    multipliers *= actionConfig.multipliers.revenue * (metadata.totalRevenue / 1000000) || 1;
  }
  if (action === 'resourcesAllocated' && metadata.resourceScore) {
    multipliers *= actionConfig.multipliers.resourceScore * (metadata.resourceScore / 1000) || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const aggregateBranchData = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await multiBranchAnalyticsService.aggregateBranchData(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { branchCount: result.aggregatedData.length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.branchDataAggregated',
        messageParams: { branchCount: result.aggregatedData.length },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { branchCount: result.aggregatedData.length },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
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
        userId: merchantId,
        role: 'merchant',
        action: 'aggregate_branch_data',
        details: { merchantId, action: 'branchDataAggregated', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:branchDataAggregated', { merchantId, branchCount: result.aggregatedData.length, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const compareBranchPerformance = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await multiBranchAnalyticsService.compareBranchPerformance(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { performanceScore: result.ranked[0]?.performanceScore || 0 }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.branchPerformanceCompared',
        messageParams: { branchCount: result.ranked.length },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { performanceScore: result.ranked[0]?.performanceScore || 0 },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
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
        userId: merchantId,
        role: 'merchant',
        action: 'compare_branch_performance',
        details: { merchantId, action: 'branchPerformanceCompared', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:branchPerformanceCompared', { merchantId, branchCount: result.ranked.length, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const generateMultiBranchReports = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await multiBranchAnalyticsService.generateMultiBranchReports(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { totalRevenue: result.report.summary.totalRevenue }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.multiBranchReportsGenerated',
        messageParams: { branchCount: result.report.summary.branchCount },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { totalRevenue: result.report.summary.totalRevenue },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
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
        userId: merchantId,
        role: 'merchant',
        action: 'generate_multi_branch_reports',
        details: { merchantId, action: 'multiBranchReportsGenerated', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:multiBranchReportsGenerated', { merchantId, branchCount: result.report.summary.branchCount, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const allocateResources = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await multiBranchAnalyticsService.allocateResources(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { resourceScore: result.suggestions.reduce((sum, a) => sum + a.resourceScore, 0) }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.resourcesAllocated',
        messageParams: { branchCount: result.suggestions.length },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'analytics',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { resourceScore: result.suggestions.reduce((sum, a) => sum + a.resourceScore, 0) },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
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
        userId: merchantId,
        role: 'merchant',
        action: 'allocate_resources',
        details: { merchantId, action: 'resourcesAllocated', points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:analytics:resourcesAllocated', { merchantId, branchCount: result.suggestions.length, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { aggregateBranchData, compareBranchPerformance, generateMultiBranchReports, allocateResources };