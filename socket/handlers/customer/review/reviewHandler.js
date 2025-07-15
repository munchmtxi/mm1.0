'use strict';

/**
 * Review Socket Handler
 * Manages socket connections and events for customer reviews.
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const reviewEvents = require('@socket/events/customer/review/reviewEvents');
const socketConstants = require('@constants/common/socketConstants');
const { formatMessage } = require('@utils/localization');

/**
 * Initializes review socket handlers.
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 */
module.exports = (io, socket) => {
  const userId = socket.user?.userId;
  const role = socket.user?.role || 'customer';
  const languageCode = socket.user?.languageCode || 'en';

  if (!userId) {
    logger.warn('Socket connection without userId', { socketId: socket.id });
    return socket.disconnect();
  }

  // Join customer room
  socket.join(`${role}:${userId}`);

  // Handle review submission event
  socket.on(reviewEvents.REVIEW_SUBMITTED, async (data) => {
    try {
      const { reviewId, serviceType, targetType, targetId } = data;
      await socketService.emit(io, reviewEvents.REVIEW_SUBMITTED, {
        userId,
        role,
        auditAction: 'REVIEW_SUBMITTED',
        details: { reviewId, serviceType, targetType, targetId },
      }, `${targetType}:${targetId}`, languageCode);
      logger.info('Review submitted event handled', { userId, reviewId });
    } catch (error) {
      logger.error('Failed to handle review submitted event', { userId, error: error.message });
    }
  });

  // Handle review interaction event
  socket.on(reviewEvents.REVIEW_INTERACTION, async (data) => {
    try {
      const { reviewId, action, interactionId } = data;
      await socketService.emit(io, reviewEvents.REVIEW_INTERACTION, {
        userId,
        role,
        auditAction: 'REVIEW_INTERACTION',
        details: { reviewId, action, interactionId },
      }, `customer:${data.reviewOwnerId}`, languageCode);
      logger.info('Review interaction event handled', { userId, reviewId, action });
    } catch (error) {
      logger.error('Failed to handle review interaction event', { userId, reviewId, action, error: error.message });
    }
  });
};