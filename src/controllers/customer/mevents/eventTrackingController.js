'use strict';

const { sequelize } = require('@models');
const eventTrackingService = require('@services/customer/mevents/eventTrackingService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService'); // Updated import
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const meventsTrackingConstants = require('@constants/meventsTrackingConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const trackUserInteractions = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { eventId, interactionType, metadata } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Tracking user interaction', { customerId, interactionType });

  const transaction = await sequelize.transaction();
  try {
    const { tracking, customer } = await eventTrackingService.trackUserInteractions({
      customerId,
      eventId,
      interactionType,
      metadata,
      transaction,
    });

    // Send notification
    const message = formatMessage({
      role: 'customer',
      module: 'mevents',
      languageCode: customer.preferred_language || 'en',
      messageKey: 'tracking.points_awarded',
      params: { points: meventsTrackingConstants.GAMIFICATION_CONSTANTS.INTERACTION_TRACKED.points || 5 },
    });
    await notificationService.sendNotification(
      {
        userId: customerId,
        notificationType: meventsTrackingConstants.NOTIFICATION_TYPES.TRACKING_POINTS_AWARDED,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language || 'en',
        eventId,
      },
      transaction
    );

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        role: 'customer',
        action: meventsTrackingConstants.AUDIT_TYPES.INTERACTION_TRACKED,
        details: { trackingId: tracking.id, interactionType, eventId, metadata },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(
      io,
      `tracking:interaction:${customerId}`,
      {
        trackingId: tracking.id,
        interactionType,
        eventId,
        userId: customerId,
        role: 'customer',
        auditAction: 'INTERACTION_TRACKED',
      },
      null,
      customer.preferred_language || 'en'
    );

    // Award gamification points
    try {
      const action = meventsTrackingConstants.GAMIFICATION_CONSTANTS.INTERACTION_TRACKED;
      await pointService.awardPoints(
        customerId,
        action.action,
        action.points || 5,
        { io, role: 'customer', trackingId: tracking.id, interactionType, eventId, languageCode: customer.preferred_language || 'en' },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: meventsTrackingConstants.SUCCESS_MESSAGES.INTERACTION_TRACKED,
      data: { trackingId: tracking.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Interaction tracking failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'INTERACTION_TRACKING_FAILED'));
  }
});

const analyzeEngagement = catchAsync(async (req, res, next) => {
  const customerId = parseInt(req.params.customerId, 10);
  let gamificationError = null;

  if (customerId !== req.user.id) {
    return next(new AppError('Unauthorized access', 403, 'UNAUTHORIZED'));
  }

  logger.info('Analyzing engagement', { customerId });

  const transaction = await sequelize.transaction();
  try {
    const { metrics, customer } = await eventTrackingService.analyzeEngagement({ customerId, transaction });

    // Award high engagement points if applicable
    if (metrics.totalInteractions >= meventsTrackingConstants.TRACKING_SETTINGS.HIGH_ENGAGEMENT_THRESHOLD) {
      try {
        const action = meventsTrackingConstants.GAMIFICATION_CONSTANTS.HIGH_ENGAGEMENT;
        await pointService.awardPoints(
          customerId,
          action.action,
          action.points || 20,
          {
            io: req.app.get('io'),
            role: 'customer',
            totalInteractions: metrics.totalInteractions,
            periodDays: meventsTrackingConstants.TRACKING_SETTINGS.ENGAGEMENT_ANALYSIS_PERIOD_DAYS,
            languageCode: customer.preferred_language || 'en',
          },
          transaction
        );

        const message = formatMessage({
          role: 'customer',
          module: 'mevents',
          languageCode: customer.preferred_language || 'en',
          messageKey: 'tracking.engagement_summary',
          params: { totalInteractions: metrics.totalInteractions, eventCount: metrics.eventCount },
        });
        await notificationService.sendNotification(
          {
            userId: customerId,
            notificationType: meventsTrackingConstants.NOTIFICATION_TYPES.ENGAGEMENT_SUMMARY,
            message,
            priority: 'MEDIUM',
            languageCode: customer.preferred_language || 'en',
          },
          transaction
        );
      } catch (error) {
        gamificationError = { message: error.message };
      }
    }

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        role: 'customer',
        action: meventsTrackingConstants.AUDIT_TYPES.ENGAGEMENT_ANALYZED,
        details: { metrics, periodDays: meventsTrackingConstants.TRACKING_SETTINGS.ENGAGEMENT_ANALYSIS_PERIOD_DAYS },
      },
      transaction
    );

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: meventsTrackingConstants.SUCCESS_MESSAGES.ENGAGEMENT_ANALYZED,
      data: { metrics, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Engagement analysis failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'ENGAGEMENT_ANALYSIS_FAILED'));
  }
});

module.exports = {
  trackUserInteractions,
  analyzeEngagement,
};