'use strict';

/**
 * Review Controller
 * Handles HTTP requests for review-related operations, integrating with reviewService,
 * localization, gamification, notification, and audit services.
 * Last Updated: July 08, 2025
 */

const reviewService = require('@services/customer/reviewService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const reviewConstants = require('@constants/common/reviewConstants');
const socketConstants = require('@constants/common/socketConstants');
const { sequelize } = require('@models');

const catchAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Submits a new review.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const submitReview = catchAsync(async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE, walletId } = req.user;
  const { serviceType, serviceId, targetType, targetId, rating, comment, title, photos, anonymous } = req.body;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const review = await reviewService.submitReview(userId, {
      serviceType,
      serviceId,
      targetType,
      targetId,
      rating,
      comment,
      title,
      photos,
      anonymous,
    }, transaction);

    // Award gamification points
    const actionMap = {
      merchant: 'merchant_review_submitted',
      staff: 'staff_review_submitted',
      driver: 'driver_review_submitted',
    };
    const action = actionMap[targetType];
    if (action) {
      const actionConfig = customerConstants.GAMIFICATION_ACTIONS.reviews.find(a => a.action === action);
      if (actionConfig) {
        await pointService.awardPoints(userId, action, actionConfig.points, {
          io: req.io,
          role: 'customer',
          languageCode,
          walletId,
        });
      }
    }

    // Send notification to target
    const notificationType = customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('review_received')
      ? 'review_received'
      : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0];
    await notificationService.sendNotification({
      userId: targetId,
      notificationType,
      messageKey: `reviews.${targetType}_review_received`,
      messageParams: { rating, serviceType },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      role: targetType,
      module: 'reviews',
      languageCode,
    });

    // Emit socket event
    await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.REVIEW_SUBMITTED, {
      userId,
      role: 'customer',
      auditAction: 'REVIEW_SUBMITTED',
      details: { reviewId: review.reviewId, serviceType, targetType, targetId },
    }, `${targetType}:${targetId}`, languageCode);

    // Log audit action
    await auditService.logAction({
      userId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REVIEW_SUBMITTED,
      details: { reviewId: review.reviewId, serviceType, targetType, targetId },
      ipAddress,
    }, transaction);

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: formatMessage('customer', 'reviews', languageCode, 'success.review_submitted'),
      data: review,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent('Review submission failed', { userId, error: error.message });
    next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.errorCode}` || 'error.generic'),
      error.statusCode || 500,
      error.errorCode || 'REVIEW_SUBMISSION_FAILED',
      null,
      { userId, serviceType, targetType }
    ));
  }
});

/**
 * Updates an existing review.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateReview = catchAsync(async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE } = req.user;
  const { reviewId } = req.params;
  const { rating, comment, title, photos, anonymous } = req.body;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const review = await reviewService.updateReview(userId, reviewId, {
      rating,
      comment,
      title,
      photos,
      anonymous,
    }, transaction);

    // Log audit action
    await auditService.logAction({
      userId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REVIEW_UPDATED,
      details: { reviewId, serviceType: review.serviceType, targetType: review.targetType },
      ipAddress,
    }, transaction);

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'reviews', languageCode, 'success.review_updated'),
      data: review,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent('Review update failed', { userId, reviewId, error: error.message });
    next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.errorCode}` || 'error.generic'),
      error.statusCode || 500,
      error.errorCode || 'REVIEW_UPDATE_FAILED',
      null,
      { userId, reviewId }
    ));
  }
});

/**
 * Deletes a review.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteReview = catchAsync(async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE } = req.user;
  const { reviewId } = req.params;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const result = await reviewService.deleteReview(userId, reviewId, transaction);

    // Log audit action
    await auditService.logAction({
      userId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REVIEW_DELETED,
      details: { reviewId },
      ipAddress,
    }, transaction);

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'reviews', languageCode, 'success.review_deleted'),
      data: result,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent('Review deletion failed', { userId, reviewId, error: error.message });
    next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.errorCode}` || 'error.generic'),
      error.statusCode || 500,
      error.errorCode || 'REVIEW_DELETION_FAILED',
      null,
      { userId, reviewId }
    ));
  }
});

/**
 * Manages community interactions (upvote, comment) on a review.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const manageCommunityInteraction = catchAsync(async (req, res, next) => {
  const { userId, languageCode = customerConstants.DEFAULT_LANGUAGE, walletId } = req.user;
  const { reviewId } = req.params;
  const { action, comment } = req.body;
  const ipAddress = req.ip;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const interaction = await reviewService.manageCommunityInteractions(reviewId, {
      customerId: userId,
      action,
      comment,
    }, transaction);

    // Award gamification points
    const actionMap = {
      UPVOTE: 'review_upvoted',
      COMMENT: 'review_comment_added',
    };
    const gamificationAction = actionMap[action];
    if (gamificationAction) {
      const actionConfig = customerConstants.GAMIFICATION_ACTIONS.reviews.find(a => a.action === gamificationAction);
      if (actionConfig) {
        await pointService.awardPoints(userId, gamificationAction, actionConfig.points, {
          io: req.io,
          role: 'customer',
          languageCode,
          walletId,
        });
      }
    }

    // Send notification to review owner
    const notificationType = customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('review_interaction')
      ? 'review_interaction'
      : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0];
    await notificationService.sendNotification({
      userId: interaction.review.customer_id,
      notificationType,
      messageKey: `reviews.interaction_${action.toLowerCase()}`,
      messageParams: { action },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      role: 'customer',
      module: 'reviews',
      languageCode,
    });

    // Emit socket event
    await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.REVIEW_INTERACTION, {
      userId,
      role: 'customer',
      auditAction: 'REVIEW_INTERACTION',
      details: { reviewId, action, interactionId: interaction.interactionId },
    }, `customer:${interaction.review.customer_id}`, languageCode);

    // Log audit action
    await auditService.logAction({
      userId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.REVIEW_INTERACTION,
      details: { reviewId, action, interactionId: interaction.interactionId },
      ipAddress,
    }, transaction);

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: formatMessage('customer', 'reviews', languageCode, `success.interaction_${action.toLowerCase()}`),
      data: interaction,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.logErrorEvent('Review interaction failed', { userId, reviewId, action, error: error.message });
    next(new AppError(
      formatMessage('customer', 'reviews', languageCode, `error.${error.errorCode}` || 'error.generic'),
      error.statusCode || 500,
      error.errorCode || 'REVIEW_INTERACTION_FAILED',
      null,
      { userId, reviewId, action }
    ));
  }
});

module.exports = {
  submitReview,
  updateReview,
  deleteReview,
  manageCommunityInteraction,
};