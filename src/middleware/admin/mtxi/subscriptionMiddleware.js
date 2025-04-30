'use strict';

const { Subscription } = require('@models');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { ERROR_CODES } = require('@constants/common/subscriptionConstants');

const validateSubscriptionAccess = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Unauthorized subscription access attempt', { userId: req.user?.id, subscriptionId });
    return next(new AppError('Admin access required', 403, ERROR_CODES.UNAUTHORIZED));
  }

  const subscription = await Subscription.findByPk(subscriptionId);
  if (!subscription) {
    logger.warn('Subscription not found', { subscriptionId, adminId: req.user.id });
    return next(new AppError('Subscription not found', 404, ERROR_CODES.NOT_FOUND));
  }

  logger.info('Subscription access validated', { subscriptionId, adminId: req.user.id });
  req.subscription = subscription; // Attach subscription to request for downstream use
  next();
});

module.exports = { validateSubscriptionAccess };