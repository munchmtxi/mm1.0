'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const validateCancellationAccess = catchAsync(async (req, res, next) => {
  const { serviceId, serviceType } = req.body;
  const userId = req.user.id;

  logger.info('Validating cancellation access', { serviceId, serviceType, userId });

  const { Booking, Order, Ride, InDiningOrder, Customer } = require('@models');
  let service;

  switch (serviceType) {
    case 'mtables':
      service = await Booking.findByPk(serviceId);
      break;
    case 'munch':
      service = await Order.findByPk(serviceId);
      break;
    case 'mtxi':
      service = await Ride.findByPk(serviceId);
      break;
    case 'in_dining':
      service = await InDiningOrder.findByPk(serviceId);
      break;
    default:
      throw new AppError('Invalid service type', 400, 'INVALID_REQUEST');
  }

  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer || service.customer_id !== customer.id) {
    throw new AppError('Forbidden', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

const validateRefundAccess = catchAsync(async (req, res, next) => {
  const { serviceId, walletId } = req.body;
  const userId = req.user.id;

  logger.info('Validating refund access', { serviceId, walletId, userId });

  const { Booking, Order, Ride, InDiningOrder, Wallet } = require('@models');
  let service;

  switch (req.body.serviceType) {
    case 'mtables':
      service = await Booking.findByPk(serviceId);
      break;
    case 'munch':
      service = await Order.findByPk(serviceId);
      break;
    case 'mtxi':
      service = await Ride.findByPk(serviceId);
      break;
    case 'in_dining':
      service = await InDiningOrder.findByPk(serviceId);
      break;
    default:
      throw new AppError('Invalid service type', 400, 'INVALID_REQUEST');
  }

  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  const wallet = await Wallet.findByPk(walletId);
  if (!wallet || wallet.user_id !== userId) {
    throw new AppError('Invalid wallet', 400, 'INVALID_WALLET');
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  validateCancellationAccess,
  validateRefundAccess,
};