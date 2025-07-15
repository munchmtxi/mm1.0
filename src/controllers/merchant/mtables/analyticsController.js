'use strict';

const { sequelize } = require('@models');
const analyticsService = require('@services/merchant/mtables/analyticsService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'salesTracked' && metadata.totalOrders) {
    multipliers *= actionConfig.multipliers.totalOrders * metadata.totalOrders || 1;
  }
  if (action === 'bookingTrendsAnalyzed' && metadata.bookingCount) {
    multipliers *= actionConfig.multipliers.bookingCount * metadata.bookingCount || 1;
  }
  if (action === 'reportGenerated' && metadata.trendsCount) {
    multipliers *= actionConfig.multipliers.trendsCount * metadata.trendsCount || 1;
  }
  if (action === 'engagementAnalyzed' && metadata.totalCustomers) {
    multipliers *= actionConfig.multipliers.totalCustomers * metadata.totalCustomers || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const trackSales = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const { period } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.trackSales(restaurantId, period, ipAddress, transaction);
    const points = calculatePoints(result.action, { totalOrders: result.totalOrders }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: restaurantId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
        messageKey: 'mtables.salesTracked',
        messageParams: { period },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(restaurantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { totalOrders: result.totalOrders },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: restaurantId,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
          messageKey: 'mtables.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: restaurantId,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.SALES_TRACKED,
        details: { period, ...result, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:salesTracked', {
      restaurantId,
      period,
      points,
    }, `merchant:${restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const analyzeBookingTrends = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const { period } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.analyzeBookingTrends(restaurantId, period, ipAddress, transaction);
    const points = calculatePoints(result.action, { bookingCount: result.trends.length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: restaurantId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
        messageKey: 'mtables.bookingTrendsAnalyzed',
        messageParams: { period },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(restaurantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { bookingCount: result.trends.length },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: restaurantId,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
          messageKey: 'mtables.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: restaurantId,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.BOOKING_TRENDS_ANALYZED,
        details: { period, trendsCount: result.trends.length, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:bookingTrendsAnalyzed', {
      restaurantId,
      period,
      points,
    }, `merchant:${restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const generateBookingReports = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.generateBookingReports(restaurantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { trendsCount: result.bookingTrends.length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: restaurantId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
        messageKey: 'mtables.reportGenerated',
        messageParams: { date: result.generatedAt },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[2],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(restaurantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { trendsCount: result.bookingTrends.length },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: restaurantId,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.REPORT_GENERATED,
          messageKey: 'mtables.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: restaurantId,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.REPORT_GENERATED,
        details: { generatedAt: result.generatedAt, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:reportGenerated', {
      restaurantId,
      reportId: result.generatedAt.getTime(),
      points,
    }, `merchant:${restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const analyzeCustomerEngagement = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await analyticsService.analyzeCustomerEngagement(restaurantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { totalCustomers: result.totalCustomers }, 'merchant');

    for (const customer of result.topEngaged) {
      const serviceCount = customer.bookingCount + customer.orderCount;
      const customerPoints = calculatePoints('crossServiceUsage', { serviceCount }, 'customer');

      if (customerPoints > 0) {
        await gamificationService.awardPoints(customer.userId, 'crossServiceUsage', customerPoints, {
          io,
          role: 'customer',
          languageCode: customer.language,
          metadata: { serviceCount },
        }, transaction);

        await notificationService.sendNotification(
          {
            userId: customer.userId,
            notificationType: mtablesConstants.NOTIFICATION_TYPES.ENGAGEMENT_ANALYZED,
            messageKey: 'mtables.customerPointsAwarded',
            messageParams: { points: customerPoints, action: 'crossServiceUsage' },
            priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
            role: 'customer',
            module: 'mtables',
            languageCode: customer.language,
          },
          transaction
        );
      }
    }

    await notificationService.sendNotification(
      {
        userId: restaurantId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.ENGAGEMENT_ANALYZED,
        messageKey: 'mtables.engagementAnalyzed',
        messageParams: { totalCustomers: result.totalCustomers },
        priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
        role: 'merchant',
        module: 'mtables',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(restaurantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { totalCustomers: result.totalCustomers },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: restaurantId,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.ENGAGEMENT_ANALYZED,
          messageKey: 'mtables.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[0],
          role: 'merchant',
          module: 'mtables',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: restaurantId,
        role: 'merchant',
        action: mtablesConstants.AUDIT_TYPES.ENGAGEMENT_ANALYZED,
        details: { topEngagedCount: result.topEngaged.length, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mtables:engagementAnalyzed', {
      restaurantId,
      topEngagedCount: result.topEngaged.length,
      points,
    }, `merchant:${restaurantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { trackSales, analyzeBookingTrends, generateBookingReports, analyzeCustomerEngagement };