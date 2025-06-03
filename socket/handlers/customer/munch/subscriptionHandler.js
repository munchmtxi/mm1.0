'use strict';

const socketService = require('@services/common/socketService');
const subscriptionEvents = require('@socket/events/customer/munch/subscriptionEvents');
const logger = require('@utils/logger');

const handleSubscriptionEnrolled = async (io, data) => {
  const { subscriptionId, planId, customerId } = data;
  await socketService.emit(io, subscriptionEvents.SUBSCRIPTION_ENROLLED, { subscriptionId, planId, customerId }, `customer:${customerId}`);
  logger.info('Subscription enrolled event emitted', { subscriptionId, customerId });
};

const handleSubscriptionUpgraded = async (io, data) => {
  const { subscriptionId, status, customerId } = data;
  await socketService.emit(io, subscriptionEvents.SUBSCRIPTION_UPGRADED, { subscriptionId, status, customerId }, `customer:${customerId}`);
  logger.info('Subscription upgraded event emitted', { subscriptionId, customerId });
};

const handleSubscriptionDowngraded = async (io, data) => {
  const { subscriptionId, status, customerId } = data;
  await socketService.emit(io, subscriptionEvents.SUBSCRIPTION_DOWNGRADED, { subscriptionId, status, customerId }, `customer:${customerId}`);
  logger.info('Subscription downgraded event emitted', { subscriptionId, customerId });
};

const handleSubscriptionPaused = async (io, data) => {
  const { subscriptionId, status, customerId } = data;
  await socketService.emit(io, subscriptionEvents.SUBSCRIPTION_PAUSED, { subscriptionId, status, customerId }, `customer:${customerId}`);
  logger.info('Subscription paused event emitted', { subscriptionId, customerId });
};

const handleSubscriptionCancelled = async (io, data) => {
  const { subscriptionId, status, customerId } = data;
  await socketService.emit(io, subscriptionEvents.SUBSCRIPTION_CANCELLED, { subscriptionId, status, customerId }, `customer:${customerId}`);
  logger.info('Subscription cancelled event emitted', { subscriptionId, customerId });
};

module.exports = {
  handleSubscriptionEnrolled,
  handleSubscriptionUpgraded,
  handleSubscriptionDowngraded,
  handleSubscriptionPaused,
  handleSubscriptionCancelled,
};