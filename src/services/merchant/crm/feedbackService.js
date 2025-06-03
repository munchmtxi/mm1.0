'use strict';

/**
 * feedbackService.js
 * Manages customer reviews, community interactions, and feedback responses with gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Review, ReviewInteraction, Customer, Merchant, GamificationPoints, AuditLog, Notification } = require('@models');

/**
 * Gathers customer reviews for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} reviewData - Review details (customerId, rating, comment, serviceType, serviceId).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Review record.
 */
async function collectReviews(merchantId, reviewData, io) {
  try {
    if (!merchantId || !reviewData?.customerId || !reviewData?.rating || !reviewData?.serviceType || !reviewData?.serviceId) {
      throw new Error('Merchant ID, customer ID, rating, service type, and service ID required');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const customer = await Customer.findByPk(reviewData.customerId);
    if (!customer) throw new Error('Customer not found');

    const validServiceTypes = ['order', 'in_dining_order', 'booking', 'ride'];
    if (!validServiceTypes.includes(reviewData.serviceType)) throw new Error('Invalid service type');

    if (reviewData.rating < 1 || reviewData.rating > 5) throw new Error('Rating must be between 1 and 5');

    const review = await Review.create({
      customer_id: reviewData.customerId,
      merchant_id: merchantId,
      service_type: reviewData.serviceType,
      service_id: reviewData.serviceId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      status: 'pending',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'collect_reviews',
      details: { merchantId, reviewId: review.id, rating: reviewData.rating },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'feedback:reviewCollected', {
      merchantId,
      reviewId: review.id,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'review_received',
      messageKey: 'feedback.review_received',
      messageParams: { rating: reviewData.rating },
      role: 'merchant',
      module: 'feedback',
      languageCode: merchant.preferred_language || 'en',
    });

    return review;
  } catch (error) {
    logger.error('Error collecting reviews', { error: error.message });
    throw error;
  }
}

/**
 * Handles upvotes or comments on a review.
 * @param {number} reviewId - Review ID.
 * @param {Object} action - Interaction details (customerId, type, comment).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Interaction record.
 */
async function manageCommunityInteractions(reviewId, action, io) {
  try {
    if (!reviewId || !action?.customerId || !action?.type) {
      throw new Error('Review ID, customer ID, and action type required');
    }

    const review = await Review.findByPk(reviewId);
    if (!review) throw new Error('Review not found');

    const customer = await Customer.findByPk(action.customerId);
    if (!customer) throw new Error('Customer not found');

    const validTypes = ['upvote', 'comment'];
    if (!validTypes.includes(action.type)) throw new Error('Invalid action type');

    const interaction = await ReviewInteraction.create({
      review_id: reviewId,
      customer_id: action.customerId,
      action: action.type,
      comment: action.type === 'comment' ? action.comment : null,
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'manage_community_interactions',
      details: { reviewId, actionType: action.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'feedback:interactionManaged', {
      reviewId,
      interactionId: interaction.id,
      actionType: action.type,
    }, `merchant:${review.merchant_id}`);

    await notificationService.sendNotification({
      userId: review.customer_id,
      notificationType: 'review_interaction',
      messageKey: 'feedback.review_interaction',
      messageParams: { action: action.type },
      role: 'customer',
      module: 'feedback',
      languageCode: customer.preferred_language || 'en',
    });

    return interaction;
  } catch (error) {
    logger.error('Error managing community interactions', { error: error.message });
    throw error;
  }
}

/**
 * Replies to customer feedback.
 * @param {number} reviewId - Review ID.
 * @param {Object} response - Response details (merchantId, content).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated review.
 */
async function respondToFeedback(reviewId, response, io) {
  try {
    if (!reviewId || !response?.merchantId || !response?.content) {
      throw new Error('Review ID, merchant ID, and response content required');
    }

    const review = await Review.findByPk(reviewId);
    if (!review) throw new Error('Review not found');

    const merchant = await Merchant.findByPk(response.merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    await review.update({
      comment: review.comment ? `${review.comment}\nMerchant Response: ${response.content}` : `Merchant Response: ${response.content}`,
      status: 'approved',
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'respond_to_feedback',
      details: { reviewId, responseContent: response.content },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'feedback:feedbackResponded', {
      reviewId,
      merchantId: response.merchantId,
    }, `merchant:${response.merchantId}`);

    await notificationService.sendNotification({
      userId: review.customer_id,
      notificationType: 'feedback_response',
      messageKey: 'feedback.feedback_response',
      messageParams: { content: response.content },
      role: 'customer',
      module: 'feedback',
      languageCode: (await Customer.findByPk(review.customer_id)).preferred_language || 'en',
    });

    return review;
  } catch (error) {
    logger.error('Error responding to feedback', { error: error.message });
    throw error;
  }
}

/**
 * Awards review or tipping points for customers.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackFeedbackGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'feedback_interaction',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_feedback_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'feedback:pointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'feedback_points_awarded',
      messageKey: 'feedback.feedback_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'feedback',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking feedback gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  collectReviews,
  manageCommunityInteractions,
  respondToFeedback,
  trackFeedbackGamification,
};