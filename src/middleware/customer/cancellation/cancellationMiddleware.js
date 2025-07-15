'use strict';

/**
 * Middleware for cancellation and refund validation.
 */
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Validates cancellation access.
 */
const validateCancellationAccess = catchAsync(async (req, res, next) => {
  const { serviceId, serviceType } = req.body;
  const userId = req.user.id;

  logger.info('Validating cancellation access', { serviceId, serviceType, userId });

  const { Booking, Order, Ride, InDiningOrder, ParkingBooking, Customer } = require('@models');
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
    case 'mpark':
      service = await ParkingBooking.findByPk(serviceId);
      break;
    default:
      throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES.find(code => code === 'INVALID_REQUEST'));
  }

  if (!service) {
    throw new AppError('Service not found', 404, customerConstants.ERROR_CODES.find(code => code === 'SERVICE_NOT_FOUND'));
  }

  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer || service.customer_id !== customer.id) {
    throw new AppError('Forbidden', 403, customerConstants.ERROR_CODES.find(code => code === 'PERMISSION_DENIED'));
  }

  next();
});

/**
 * Validates refund access.
 */
const validateRefundAccess = catchAsync(async (req, res, next) => {
  const { serviceId, walletId, serviceType } = req.body;
  const userId = req.user.id;

  logger.info('Validating refund access', { serviceId, walletId, serviceType, userId });

  const { Booking, Order, Ride, InDiningOrder, ParkingBooking, Wallet } = require('@models');
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
    case 'mpark':
      service = await ParkingBooking.findByPk(serviceId);
      break;
    default:
      throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES.find(code => code === 'INVALID_REQUEST'));
  }

  if (!service) {
    throw new AppError('Service not found', 404, customerConstants.ERROR_CODES.find(code => code === 'SERVICE_NOT_FOUND'));
  }

  const wallet = await Wallet.findByPk(walletId);
  if (!wallet || wallet.user_id !== userId) {
    throw new AppError('Invalid wallet', 400, customerConstants.ERROR_CODES.find(code => code === 'INVALID_WALLET'));
  }

  next();
});

module.exports = {
  validateCancellationAccess,
  validateRefundAccess,
};