'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const mtablesConstants = require('@constants/mtablesConstants');
const { Booking, Customer } = require('@models');

const checkBookingAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId, friendCustomerId } = req.params || req.body;

  logger.info('Validating booking access', { customerId, bookingId, friendCustomerId });

  if (bookingId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.customer_id !== customerId) {
      throw new AppError('Booking not found', 400, mtablesConstants.ERROR_CODES.find(c => c === 'BOOKING_NOT_FOUND') || 'BOOKING_NOT_FOUND');
    }
  }

  if (friendCustomerId) {
    const friend = await Customer.findByPk(friendCustomerId);
    if (!friend) {
      throw new AppError('Friend not found', 400, mtablesConstants.ERROR_CODES.find(c => c === 'INVALID_FRIEND') || 'INVALID_FRIEND');
    }
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  checkBookingAccess,
};