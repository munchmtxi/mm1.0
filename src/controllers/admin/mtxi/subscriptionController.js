'use strict';

const adminSubscriptionService = require('@services/admin/mtxi/adminSubscriptionService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { ERROR_CODES } = require('@constants/common/subscriptionConstants');

const getSubscriptionDetails = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const subscription = await adminSubscriptionService.getSubscriptionDetails(subscriptionId);
  logger.info('Admin retrieved subscription details', { subscriptionId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});

const updateSubscriptionStatus = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { status } = req.body;
  if (!status) {
    return next(new AppError('Status is required', 400, ERROR_CODES.INVALID_INPUT));
  }
  const subscription = await adminSubscriptionService.updateSubscriptionStatus(subscriptionId, status);
  logger.info('Admin updated subscription status', { subscriptionId, status, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { subscription },
  });
});

const handleSubscriptionDispute = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { action, reason } = req.body;
  if (!action || !reason) {
    return next(new AppError('Action and reason are required', 400, ERROR_CODES.INVALID_INPUT));
  }
  const resolution = await adminSubscriptionService.handleSubscriptionDispute(subscriptionId, { action, reason });
  logger.info('Admin handled subscription dispute', { subscriptionId, action, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { resolution },
  });
});

module.exports = { getSubscriptionDetails, updateSubscriptionStatus, handleSubscriptionDispute };