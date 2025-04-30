'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const emitSubscriptionShareInvite = (subscriptionId, customerId, friendId) => {
  try {
    socketService.emitToUser(friendId, 'subscription:invite', { subscriptionId, inviterId: customerId });
    socketService.emitToUser(customerId, 'subscription:invite', { subscriptionId, friendId });
    logger.info('Subscription share invite emitted', { subscriptionId, customerId, friendId });
  } catch (error) {
    logger.error('Failed to emit subscription share invite', { error: error.message, subscriptionId });
  }
};

const emitSubscriptionShareResponse = (subscriptionId, customerId, accepted) => {
  try {
    socketService.emitToUser(customerId, 'subscription:response', { subscriptionId, customerId, accepted });
    logger.info('Subscription share response emitted', { subscriptionId, customerId, accepted });
  } catch (error) {
    logger.error('Failed to emit subscription share response', { error: error.message, subscriptionId });
  }
};

module.exports = { emitSubscriptionShareInvite, emitSubscriptionShareResponse };