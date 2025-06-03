'use strict';

const { sequelize } = require('@models');
const { submitReview, updateReview, deleteReview, manageCommunityInteractions } = require('@services/customer/review/reviewService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const paymentConstants = require('@constants/common/paymentConstants');
const reviewEvents = require('@socket/events/customer/review/reviewEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const submitReviewAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { serviceId, serviceType, rating, comment, title, photos, anonymous } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await submitReview(customerId, serviceId, { serviceType, rating, comment, title, photos, anonymous }, transaction);
    await pointService.awardPoints(customerId, 'review', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || paymentConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REVIEW_SUBMISSION,
      messageKey: 'review_submitted',
      messageParams: { serviceType, serviceId, rating },
      deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'reviews',
    }, transaction);
    await socketService.emit(io, reviewEvents.REVIEW_SUBMITTED, {
      reviewId: result.reviewId,
      serviceType,
      serviceId,
      rating,
      status: result.status,
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'SUBMIT_REVIEW',
      userId: customerId,
      role: 'customer',
      details: `Review submitted for ${serviceType} ${serviceId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Review submitted', { customerId, serviceId, serviceType });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateReviewAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { reviewId } = req.params;
  const { rating, comment, title, photos, anonymous } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await updateReview(customerId, reviewId, { rating, comment, title, photos, anonymous }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REVIEW_SUBMISSION,
      messageKey: 'review_updated',
      messageParams: { reviewId },
      deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'reviews',
    }, transaction);
    await socketService.emit(io, reviewEvents.REVIEW_UPDATED, {
      reviewId: result.reviewId,
      serviceType: result.serviceType,
      serviceId: result.serviceId,
      rating: result.rating,
      status: result.status,
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'UPDATE_REVIEW',
      userId: customerId,
      role: 'customer',
      details: `Review ${reviewId} updated`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Review updated', { customerId, reviewId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const deleteReviewAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { reviewId } = req.params;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await deleteReview(customerId, reviewId, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REVIEW_SUBMISSION,
      messageKey: 'review_deleted',
      messageParams: { reviewId },
      deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'reviews',
    }, transaction);
    await socketService.emit(io, reviewEvents.REVIEW_DELETED, {
      reviewId,
      status: result.status,
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'DELETE_REVIEW',
      userId: customerId,
      role: 'customer',
      details: `Review ${reviewId} deleted`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Review deleted', { customerId, reviewId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageInteraction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { reviewId } = req.params;
  const { action, comment } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await manageCommunityInteractions(reviewId, { customerId, action, comment }, transaction);
    await notificationService.sendNotification({
      userId: (await Review.findByPk(reviewId, { transaction })).customer_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REVIEW_INTERACTION,
      messageKey: `review_${action}d`,
      messageParams: { reviewId },
      deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      role: 'customer',
      module: 'reviews',
    }, transaction);
    await socketService.emit(io, reviewEvents.REVIEW_INTERACTION, {
      reviewId,
      interactionId: result.interactionId,
      action,
      comment: result.comment,
    }, `customer:${(await Review.findByPk(reviewId, { transaction })).customer_id}`);
    await auditService.logAction({
      action: `REVIEW_${action.toUpperCase()}`,
      userId: customerId,
      role: 'customer',
      details: `Interaction ${action} on review ${reviewId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Review interaction processed', { reviewId, customerId, action });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { submitReviewAction, updateReviewAction, deleteReviewAction, manageInteraction };