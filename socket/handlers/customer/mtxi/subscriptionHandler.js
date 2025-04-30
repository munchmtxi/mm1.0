'use strict';

const customerSubscriptionService = require('@services/customer/mtxi/subscriptionService');
const subscriptionEvents = require('@socket/events/customer/mtxi/subscriptionEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const handleSubscriptionShare = catchAsync(async (customerId, subscriptionId, friendId) => {
  try {
    const share = await customerSubscriptionService.shareSubscription(customerId, subscriptionId, friendId);
    subscriptionEvents.emitSubscriptionShareInvite(subscriptionId, customerId, friendId);
    logger.info('Subscription share handled', { subscriptionId, customerId, friendId });
    return share;
  } catch (error) {
    logger.error('Failed to handle subscription share', { error: error.message, subscriptionId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to share subscription', 500, 'INTERNAL_SERVER_ERROR');
  }
});

const handleSubscriptionShareResponse = catchAsync(async (customerId, subscriptionId, accept) => {
  try {
    const share = await customerSubscriptionService.respondToSubscriptionShare(customerId, subscriptionId, accept);
    subscriptionEvents.emitSubscriptionShareResponse(subscriptionId, customerId, accept);
    logger.info('Subscription share response handled', { subscriptionId, customerId, accept });
    return share;
  } catch (error) {
    logger.error('Failed to handle subscription share response', { error: error.message, subscriptionId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to respond to subscription share', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = { handleSubscriptionShare, handleSubscriptionShareResponse };