'use strict';

const socketService = require('@services/common/socketService');
const reviewEvents = require('@socket/events/customer/review/reviewEvents');
const logger = require('@utils/logger');

const handleReviewSubmission = async (io, data, roomId) => {
  const { reviewId, serviceType, serviceId, rating, status } = data;
  await socketService.emit(io, reviewEvents.REVIEW_SUBMITTED, { reviewId, serviceType, serviceId, rating, status }, roomId);
  logger.info('Review submitted', event { reviewId });
};

const handleReviewUpdate = async (io, data, roomId) => {
  const { reviewId, serviceType, serviceId, rating, status } = data;
  await socketService.emit(io, reviewEvents.REVIEW_UPDATED, { reviewId, serviceType, serviceId, rating, status }, roomId);
  logger.info('Review updated', event { reviewId });
};

const handleReviewDeletion = async (io, data, roomId) => {
  const { reviewId, status } = data;
  await socketService.emit(io, reviewEvents.REVIEW_DELETED, { reviewId, status }, roomId);
  logger.info('Review deleted', event { reviewId });
};

const handleReviewInteraction = async (io, data, roomId) =>) {
  const { reviewId, interactionId, action, comment } = data;
  await socketService.sendData(io, reviewEvents.REVIEW_INTERACTION, { reviewId, interactionId, action, comment }, roomId);
  logger.info('Review interaction processed', { reviewId, interactionId });
};

module.exports = { handleReviewSubmission, handleReviewUpdate, handleReviewDeletion, handleReviewInteraction };