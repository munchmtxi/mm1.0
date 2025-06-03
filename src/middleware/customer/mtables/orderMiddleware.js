'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const mtablesConstants = require('@constants/mtablesConstants');
const { InDiningOrder, Cart, Booking } = require('@models');

const checkOrderAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { orderId, cartId, bookingId } = req.params.orderId ? req.params : req.body;

  logger.info('Validating order access', { customerId, orderId, cartId, bookingId });

  if (orderId) {
    const order = await InDiningOrder.findByPk(orderId);
    if (!order || order.customer_id !== customerId) {
      throw new AppError('Order not found', 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_NOT_FOUND') || 'ORDER_NOT_FOUND');
    }
  }

  if (cartId) {
    const cart = await Cart.findByPk(cartId);
    if (!cart || cart.customer_id !== customerId) {
      throw new AppError('Invalid cart', 400, mtablesConstants.ERROR_CODES.find(c => c === 'INVALID_CART') || 'INVALID_CART');
    }
  }

  if (bookingId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.customer_id !== customerId) {
      throw new AppError('Invalid booking', 400, mtablesConstants.ERROR_CODES.find(c => c === 'BOOKING_NOT_FOUND') || 'BOOKING_NOT_FOUND');
    }
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  checkOrderAccess,
};