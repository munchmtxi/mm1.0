'use strict';

const customerTipService = require('@services/customer/mtxi/tipService');
const tipEvents = require('@socket/events/customer/mtxi/tipEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const handleTipSubmission = catchAsync(async (customerId, rideId, amount, driverId) => {
  try {
    // Validate inputs
    if (!Number.isInteger(rideId) || rideId < 1) {
      logger.warn('Invalid ride ID', { rideId, customerId });
      throw new AppError('Ride ID must be a positive integer', 400, 'INVALID_INPUT');
    }
    if (typeof amount !== 'number' || amount < 0.01) {
      logger.warn('Invalid tip amount', { amount, customerId });
      throw new AppError('Amount must be a positive number', 400, 'INVALID_INPUT');
    }
    if (!Number.isInteger(driverId) || driverId < 1) {
      logger.warn('Invalid driver ID', { driverId, customerId });
      throw new AppError('Driver ID must be a positive integer', 400, 'INVALID_INPUT');
    }

    const payment = await customerTipService.submitTip(customerId, rideId, amount);
    tipEvents.emitTipSubmitted(payment.id, rideId, customerId, driverId);
    logger.info('Tip submission handled', { paymentId: payment.id, rideId, customerId });
    return payment;
  } catch (error) {
    logger.error('Failed to handle tip submission', { error: error.message, rideId, customerId });
    throw error instanceof AppError ? error : new AppError('Failed to submit tip', 500, 'INTERNAL_SERVER_ERROR');
  }
});

module.exports = { handleTipSubmission };