'use strict';

const { sequelize } = require('@models');
const analyticsService = require('@services/customer/analytics/analyticsService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization');
const GamificationPointService = require('@services/common/pointService');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const trackBehavior = catchAsync(async (req, res, next) => {
  const customerId = req.params.customerId || req.body.customer_id;
  const ipAddress = req.ip || '127.0.0.1';
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Tracking customer behavior', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const { customer, behavior } = await analyticsService.trackCustomerBehavior({
      customerId,
      transaction,
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.TRACK_BEHAVIOR,
      details: behavior,
      ipAddress,
    }, transaction);

    await socketService.emit(io, 'analytics:behavior_tracked', { userId: customerId, behavior }, `customer:${customerId}`);

    // Award gamification points for behavior tracking
    const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'behavior_tracked');
    if (action) {
      try {
        await GamificationPointService.awardPoints({
          userId: customerId,
          action: action.action,
          points: action.points || 10,
          metadata: {
            io,
            role: 'customer',
            languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
          },
        });
      } catch (error) {
        gamificationError = { message: error.message };
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'analytics', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'behavior_tracked', { customerId }),
      data: { behavior, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Behavior tracking failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'BEHAVIOR_TRACKING_FAILED'));
  }
});

const analyzeSpending = catchAsync(async (req, res, next) => {
  const customerId = req.params.customerId || req.body.customer_id;
  const ipAddress = req.ip || '127.0.0.1';
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Analyzing spending trends', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const { customer, trends } = await analyticsService.analyzeSpendingTrends({
      customerId,
      transaction,
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.ANALYZE_SPENDING,
      details: trends,
      ipAddress,
    }, transaction);

    await socketService.emit(io, 'analytics:spending_trends', { userId: customerId, trends }, `customer:${customerId}`);

    // Award gamification points for spending analysis
    const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'spending_analyzed');
    if (action) {
      try {
        await GamificationPointService.awardPoints({
          userId: customerId,
          action: action.action,
          points: action.points || 10,
          metadata: {
            io,
            role: 'customer',
            languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
          },
        });
      } catch (error) {
        gamificationError = { message: error.message };
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'analytics', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'spending_trends_analyzed', { customerId }),
      data: { trends, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Spending analysis failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'SPENDING_ANALYSIS_FAILED'));
  }
});

const getRecommendations = catchAsync(async (req, res, next) => {
  const customerId = req.params.customerId || req.body.customer_id;
  const ipAddress = req.ip || '127.0.0.1';
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Providing recommendations', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const { customer, recommendationData, recommendationCount } = await analyticsService.provideRecommendations({
      customerId,
      transaction,
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.PROVIDE_RECOMMENDATIONS,
      details: { recommendationCount },
      ipAddress,
    }, transaction);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'promotion',
      messageKey: 'analytics.recommendations_provided',
      messageParams: { count: recommendationCount },
      role: 'customer',
      module: 'analytics',
    }, transaction);

    await socketService.emit(io, 'analytics:recommendations', { userId: customerId, recommendations: recommendationData }, `customer:${customerId}`);

    // Award gamification points for recommendations
    const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'recommendations_received');
    if (action) {
      try {
        await GamificationPointService.awardPoints({
          userId: customerId,
          action: action.action,
          points: action.points || 10,
          metadata: {
            io,
            role: 'customer',
            languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
          },
        });
      } catch (error) {
        gamificationError = { message: error.message };
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'analytics', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'recommendations_provided', {
        customerId,
        count: recommendationCount,
      }),
      data: { recommendations: recommendationData, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Recommendation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'RECOMMENDATION_FAILED'));
  }
});

module.exports = {
  trackBehavior,
  analyzeSpending,
  getRecommendations,
};