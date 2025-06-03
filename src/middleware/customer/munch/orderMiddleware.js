'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');
const munchConstants = require('@constants/customer/munch/munchConstants');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { Cart } = require('@models');

const checkCartAccess = catchAsync(async (req, res, next) => {
  const { customerId } = req.user;
  const { cartId } = req.body;
  const cart = await Cart.findByPk(cartId);
  if (!cart || cart.customer_id !== (await Customer.findOne({ where: { user_id: customerId } })).id) {
    throw new AppError('Cart not found or access denied', 403, munchConstants.ERROR_CODES.CART_NOT_FOUND);
  }
  next();
});

module.exports = {
  browseMerchants: [authenticate, restrictTo('customer'), checkPermissions('browse_merchants')],
  addToCart: [authenticate, restrictTo('customer'), checkPermissions('add_to_cart')],
  updateCart: [authenticate, restrictTo('customer'), checkPermissions('update_cart'), checkCartAccess],
  placeOrder: [authenticate, restrictTo('customer'), checkPermissions('place_order')],
  updateOrder: [authenticate, restrictTo('customer'), checkPermissions('update_order')],
  cancelOrder: [authenticate, restrictTo('customer'), checkPermissions('cancel_order')],
};