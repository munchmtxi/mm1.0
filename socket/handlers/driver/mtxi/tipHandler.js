'use strict';

const { Payment } = require('@models');
const driverTipService = require('@services/driver/tipService');
const tipEvents = require('@socket/events/driver/tipEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const handleTipConfirmation = catchAsync(async (driverId, paymentId) => {
  try {
    if (!Number.isInteger(driverId) || driverId < 1) {
      logger.warn('Invalid driver ID', { driverId });
      throw new AppError('Driver ID must be a positive integer', 400, 'INVALID_INPUT');
    }
    if (!Number.isInteger(paymentId) || paymentId < 1) {
      logger.warn('Invalid payment ID', { paymentId });
      throw new AppError('Payment ID must be a positive integer', 400, 'INVALID_INPUT');
    }

    const payment = await Payment.findOne({
      where: { id: paymentId, type: 'TIP', driver_id: driverId, status: 'completed' },
    });
    if (!payment) {
      logger.warn('Tip not found, not a tip, not assigned to driver, or not completed', { paymentId, driverId });
      throw new AppError('Tip not found or cannot be confirmed', 404, 'NOT_FOUND');
    }

    const confirmedPayment = await driverTipService.confirmTip(driverId, paymentId);
    tipEvents.emitTipConfirmed(payment.id, driverId);
    logger.info('Tip confirmation handled', { paymentId, driverId });
    return confirmedPayment;
  } catch (error) {
    logger.error('Failed to handle tip confirmation', { error: error.message, paymentId, driverId });
    throw error instanceof AppError ? error : new AppError('Failed to confirm tip', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = { handleTipConfirmation };