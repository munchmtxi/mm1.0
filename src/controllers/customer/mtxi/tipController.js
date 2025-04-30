'use strict';

const customerTipService = require('@services/customer/mtxi/tipService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const submitTip = catchAsync(async (req, res, next) => {
  const { rideId } = req.params;
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return next(new AppError('Valid amount is required', 400, 'INVALID_INPUT'));
  }
  const payment = await customerTipService.submitTip(req.user.id, rideId, amount);
  logger.info('Customer submitted tip', { paymentId: payment.id, rideId, userId: req.user.id });
  res.status(201).json({
    status: 'success',
    data: { payment },
  });
});

module.exports = { submitTip };