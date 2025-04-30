'use strict';

const adminSubscriptionService = require('@services/admin/mtxi/adminSubscriptionService');
const subscriptionEvents = require('@socket/events/admin/mtxi/subscriptionEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { ERROR_CODES } = require('@constants/common/subscriptionConstants');

const handleSubscriptionStatusUpdate = catchAsync(async (subscriptionId, status, adminId) => {
  try {
    const subscription = await adminSubscriptionService.updateSubscriptionStatus(subscriptionId, status);
    subscriptionEvents.emitSubscriptionStatusUpdate(subscriptionId, status);
    logger.info('Subscription status updated by admin', { subscriptionId, status, adminId });
    return subscription;
  } catch (error) {
    logger.error('Failed to update subscription status', { error: error.message, subscriptionId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to update subscription status', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

const handleSubscriptionDispute = catchAsync(async (subscriptionId, disputeData, adminId) => {
  try {
    const resolution = await adminSubscriptionService.handleSubscriptionDispute(subscriptionId, disputeData);
    subscriptionEvents.emitSubscriptionDispute(subscriptionId, disputeData);
    logger.info('Subscription dispute handled by admin', { subscriptionId, disputeData, adminId });
    return resolution;
  } catch (error) {
    logger.error('Failed to handle subscription dispute', { error: error.message, subscriptionId, adminId });
    throw error instanceof AppError ? error : new AppError('Failed to handle subscription dispute', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

module.exports = { handleSubscriptionStatusUpdate, handleSubscriptionDispute };