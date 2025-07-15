'use strict';

const {
  trackOrderTrends,
  monitorDeliveryPerformance,
  aggregateCustomerInsights,
  trackOrderGamification,
  analyzeDeliveryLocations,
} = require('@services/merchant/munch/analyticsService');
const { MerchantBranch } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const trackOrderTrendsController = catchAsync(async (req, res) => {
  const { restaurantId, period } = req.body;
  const trends = await trackOrderTrends(restaurantId, period);

  await socketService.emit(null, 'analytics:order_trends', { restaurantId, period, trends }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.TRACK_ORDER_TRENDS,
    details: { restaurantId, period, trends },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'analytics.orderTrendsUpdated', { restaurantId }),
    data: trends,
  });
});

const monitorDeliveryPerformanceController = catchAsync(async (req, res) => {
  const { restaurantId, period } = req.body;
  const { result, drivers } = await monitorDeliveryPerformance(restaurantId, period);

  await socketService.emit(null, 'analytics:delivery_performance', { restaurantId, period, result }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.MONITOR_DELIVERY_PERFORMANCE,
    details: { restaurantId, period, result },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  if (result.onTimeRate > 0.9) {
    const branch = await MerchantBranch.findByPk(restaurantId);
    for (const driverId of drivers) {
      await pointService.awardPoints({
        userId: driverId,
        role: 'driver',
        action: gamificationConstants.DRIVER_ACTIONS.find(a => a.action === 'high_performance_delivery').action,
        languageCode: branch.preferred_language,
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'analytics.deliveryPerformanceUpdated', { restaurantId }),
    data: result,
  });
});

const aggregateCustomerInsightsController = catchAsync(async (req, res) => {
  const { restaurantId, period } = req.body;
  const result = await aggregateCustomerInsights(restaurantId, period);

  await socketService.emit(null, 'analytics:customer_insights', { restaurantId, period, result }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.AGGREGATE_CUSTOMER_INSIGHTS,
    details: { restaurantId, period, result },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  if (result.uniqueCustomers > 100) {
    const branch = await MerchantBranch.findByPk(restaurantId);
    await notificationService.sendNotification({
      userId: branch.merchant_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.HIGH_CUSTOMER_ENGAGEMENT,
      messageKey: 'analytics.highCustomerEngagement',
      messageParams: { count: result.uniqueCustomers, period },
      role: 'merchant',
      module: 'analytics',
      languageCode: branch.preferred_language,
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'analytics.customerInsightsUpdated', { restaurantId }),
    data: result,
  });
});

const trackOrderGamificationController = catchAsync(async (req, res) => {
  const { restaurantId, period } = req.body;
  const result = await trackOrderGamification(restaurantId, period);

  await socketService.emit(null, 'analytics:gamification', { restaurantId, period, result }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.TRACK_GAMIFICATION,
    details: { restaurantId, period, result },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'analytics.gamificationUpdated', { restaurantId }),
    data: result,
  });
});

const analyzeDeliveryLocationsController = catchAsync(async (req, res) => {
  const { restaurantId, period } = req.body;
  const result = await analyzeDeliveryLocations(restaurantId, period);

  await socketService.emit(null, 'analytics:delivery_locations', { restaurantId, period, result }, `merchant:${restaurantId}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.ANALYZE_DELIVERY_LOCATIONS,
    details: { restaurantId, period, result },
    ipAddress: req.ipAddress || '127.0.0.1',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'analytics.deliveryLocationsUpdated', { restaurantId }),
    data: result,
  });
});

module.exports = {
  trackOrderTrendsController,
  monitorDeliveryPerformanceController,
  aggregateCustomerInsightsController,
  trackOrderGamificationController,
  analyzeDeliveryLocationsController,
};