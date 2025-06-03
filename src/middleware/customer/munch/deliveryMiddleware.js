'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');
const munchConstants = require('@constants/customer/munch/munchConstants');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { Order, Customer } = require('@models');

const checkOrderAccess = catchAsync(async (req, res, next) => {
  const { customerId } = req.user;
  const orderId = req.params.orderId || req.body.orderId;
  const order = await Order.findByPk(orderId);
  if (!order || order.customer_id !== (await Customer.findOne({ where: { user_id: customerId } })).id) {
    throw new AppError('Order not found or access denied', 403, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
  next();
});

module.exports = {
  trackDeliveryStatus: [authenticate, restrictTo('customer'), checkPermissions('track_delivery'), checkOrderAccess],
  cancelDelivery: [authenticate, restrictTo('customer'), checkPermissions('cancel_delivery'), checkOrderAccess],
  communicateWithDriver: [authenticate, restrictTo('customer'), checkPermissions('communicate_driver'), checkOrderAccess],
};