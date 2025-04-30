'use strict';

const { Payment, Driver } = require('@models');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validateTipConfirmation = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await Payment.findOne({
    where: { id: paymentId, type: 'tip' }, // Aligns with updated Payment.type validation
  });

  if (!payment) {
    logger.warn('Tip not found', { paymentId, driverId: req.user.id });
    return next(new AppError('Tip not found', 404, 'NOT_FOUND'));
  }

  const driver = await Driver.findOne({ where: { user_id: req.user.id } });
  if (!driver) {
    logger.warn('Driver not found for user', { userId: req.user.id });
    return next(new AppError('Driver not found', 404, 'NOT_FOUND'));
  }

  if (payment.driver_id !== driver.id) {
    logger.warn('Unauthorized tip confirmation attempt', { paymentId, driverId: req.user.id });
    return next(new AppError('Unauthorized', 403, 'UNAUTHORIZED'));
  }

  if (payment.status !== 'completed') {
    logger.warn('Tip not in completed state', { paymentId, status: payment.status, driverId: req.user.id });
    return next(new AppError('Tip cannot be confirmed', 400, 'INVALID_STATUS'));
  }

  logger.info('Tip confirmation validated', { paymentId, driverId: req.user.id });
  req.payment = payment;
  next();
});

module.exports = { validateTipConfirmation };