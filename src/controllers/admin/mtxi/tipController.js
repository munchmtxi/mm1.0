'use strict';

const adminTipService = require('@services/admin/mtxi/adminTipService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const getTipDetails = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const tip = await adminTipService.getTipDetails(paymentId);
  logger.info('Admin retrieved tip details', { paymentId, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { tip },
  });
});

const handleTipDispute = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const { action, reason } = req.body;
  if (!action || !reason) {
    return next(new AppError('Action and reason are required', 400, 'INVALID_INPUT'));
  }
  const resolution = await adminTipService.handleTipDispute(paymentId, { action, reason });
  logger.info('Admin handled tip dispute', { paymentId, action, adminId: req.user.id });
  res.status(200).json({
    status: 'success',
    data: { resolution },
  });
});

module.exports = { getTipDetails, handleTipDispute };