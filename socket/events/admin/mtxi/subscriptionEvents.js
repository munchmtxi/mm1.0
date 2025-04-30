'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const emitSubscriptionStatusUpdate = (subscriptionId, status) => {
  try {
    socketService.emitToRoom('admin:taxi', 'admin:subscriptionStatus', { subscriptionId, status });
    socketService.emitToRoom(`subscription:${subscriptionId}`, 'subscription:status', { subscriptionId, status });
    logger.info('Subscription status update emitted', { subscriptionId, status });
  } catch (error) {
    logger.error('Failed to emit subscription status update', { error: error.message, subscriptionId });
  }
};

const emitSubscriptionDispute = (subscriptionId, disputeData) => {
  try {
    socketService.emitToRoom('admin:taxi', 'admin:subscriptionDispute', { subscriptionId, ...disputeData });
    logger.info('Subscription dispute emitted', { subscriptionId, disputeData });
  } catch (error) {
    logger.error('Failed to emit subscription dispute', { error: error.message, subscriptionId });
  }
};

module.exports = { emitSubscriptionStatusUpdate, emitSubscriptionDispute };