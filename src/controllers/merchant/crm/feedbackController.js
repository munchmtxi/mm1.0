'use strict';

const { sequelize } = require('@models');
const feedbackService = require('@services/merchant/crm/feedbackService');
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

  if (action === 'reviewCollected' && metadata.rating) {
    multipliers *= actionConfig.multipliers.rating * metadata.rating || 1;
  }
  if (action === 'interactionManaged' && metadata.interactionType) {
    multipliers *= actionConfig.multipliers.interactionType * (metadata.interactionType === 'comment' ? 2 : 1) || 1;
  }
  if (action === 'feedbackResponded' && metadata.responseLength) {
    multipliers *= actionConfig.multipliers.responseLength * metadata.responseLength || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const collectReviews = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { reviewData } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await feedbackService.collectReviews(merchantId, reviewData, ipAddress, transaction);
    const points = calculatePoints(result.action, { rating: result.rating }, 'customer');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.reviewCollected',
        messageParams: { rating: result.rating },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(result.customerId, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { rating: result.rating },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: result.customerId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'customer',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: result.customerId,
        role: 'customer',
        action: 'collect_reviews',
        details: { merchantId, reviewId: result.reviewId, rating: result.rating, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:reviewCollected', { merchantId, reviewId: result.reviewId, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageCommunityInteractions = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const { action } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await feedbackService.manageCommunityInteractions(reviewId, action, ipAddress, transaction);
    const points = calculatePoints(result.action, { interactionType: result.actionType }, 'customer');

    await notificationService.sendNotification(
      {
        userId: result.customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.interactionManaged',
        messageParams: { action: result.actionType },
        priority: 'MEDIUM',
        role: 'customer',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(result.customerId, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { interactionType: result.actionType },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: result.customerId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'customer',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: result.customerId,
        role: 'customer',
        action: 'manage_community_interactions',
        details: { reviewId, actionType: result.actionType, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:interactionManaged', { reviewId, interactionId: result.interactionId, actionType: result.actionType, points }, `merchant:${result.merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const respondToFeedback = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const { response } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await feedbackService.respondToFeedback(reviewId, response, ipAddress, transaction);
    const responseLength = response.content ? response.content.length / 100 : 1;
    const points = calculatePoints(result.action, { responseLength }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: result.customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'crm.feedbackResponded',
        messageParams: { content: response.content },
        priority: 'MEDIUM',
        role: 'customer',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(result.merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { responseLength },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: result.merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: result.merchantId,
        role: 'merchant',
        action: 'respond_to_feedback',
        details: { reviewId, responseContent: response.content, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:feedbackResponded', { reviewId, merchantId: result.merchantId, points }, `merchant:${result.merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { collectReviews, manageCommunityInteractions, respondToFeedback };