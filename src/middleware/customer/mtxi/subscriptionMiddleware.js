'use strict';

const { Subscription, SubscriptionShare, Customer } = require('@models');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('@models');

const validateSubscriptionOwnership = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const subscription = await Subscription.findByPk(subscriptionId);
  if (!subscription) {
    logger.warn('Subscription not found', { subscriptionId, userId: req.user.id });
    return next(new AppError('Subscription not found', 404, 'NOT_FOUND'));
  }

  const customer = await subscription.getCustomer();
  if (!customer || customer.user_id !== req.user.id) {
    logger.warn('Unauthorized subscription access attempt', { subscriptionId, userId: req.user.id });
    return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
  }

  if (!['ride_standard', 'ride_premium'].includes(subscription.type)) {
    logger.warn('Subscription not eligible for sharing', { subscriptionId, type: subscription.type, userId: req.user.id });
    return next(new AppError('Only ride subscriptions can be shared', 400, 'INVALID_SUBSCRIPTION'));
  }

  logger.info('Subscription ownership validated', { subscriptionId, userId: req.user.id });
  req.subscription = subscription;
  next();
});

const validateSubscriptionShareResponse = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const share = await SubscriptionShare.findOne({
    where: {
      subscription_id: subscriptionId,
      customer_id: sequelize.where(sequelize.col('Customer.id'), (await Customer.findOne({ where: { user_id: req.user.id } })).id),
    },
    include: [{ model: Customer, as: 'customer' }],
  });

  if (!share) {
    logger.warn('Subscription share not found or not invited to user', { subscriptionId, userId: req.user.id });
    return next(new AppError('Subscription share not found', 404, 'NOT_FOUND'));
  }

  if (share.status !== 'invited') {
    logger.warn('Subscription share already responded', { subscriptionId, status: share.status, userId: req.user.id });
    return next(new AppError('Subscription share already responded', 400, 'INVALID_STATUS'));
  }

  logger.info('Subscription share response validated', { subscriptionId, userId: req.user.id });
  req.subscriptionShare = share;
  next();
});

module.exports = { validateSubscriptionOwnership, validateSubscriptionShareResponse };