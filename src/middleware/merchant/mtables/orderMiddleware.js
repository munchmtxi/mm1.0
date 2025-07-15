'use strict';

const { InDiningOrder, Booking, MerchantBranch } = require('@models');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const restrictOrderAccess = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { bookingId, customerId, orderId } = req.params;

    if (role === 'customer' && customerId && customerId !== userId) {
      throw new AppError(
        formatMessage('merchant', 'mtables', 'en', 'mtables.errors.unauthorized'),
        403,
        mtablesConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    if (bookingId) {
      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: MerchantBranch, as: 'branch' }],
      });
      if (!booking) {
        throw new AppError(
          formatMessage('merchant', 'mtables', 'en', 'mtables.errors.bookingNotFound'),
          404,
          mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
        );
      }
      if (role === 'merchant' && booking.branch.merchant_id !== userId) {
        throw new AppError(
          formatMessage('merchant', 'mtables', 'en', 'mtables.errors.unauthorized'),
          403,
          mtablesConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
    }

    if (orderId) {
      const order = await InDiningOrder.findByPk(orderId, {
        include: [{ model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch' }] }],
      });
      if (!order) {
        throw new AppError(
          formatMessage('merchant', 'mtables', 'en', 'mtables.errors.bookingNotFound'),
          404,
          mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
        );
      }
      if (role === 'customer' && order.customer_id !== userId) {
        throw new AppError(
          formatMessage('merchant', 'mtables', 'en', 'mtables.errors.unauthorized'),
          403,
          mtablesConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
      if (role === 'merchant' && order.booking.branch.merchant_id !== userId) {
        throw new AppError(
          formatMessage('merchant', 'mtables', 'en', 'mtables.errors.unauthorized'),
          403,
          mtablesConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
    }

    next();
  } catch (error) {
    logger.error(`restrictOrderAccess failed: ${error.message}`, { userId, bookingId, customerId, orderId });
    next(error);
  }
};

module.exports = { restrictOrderAccess };