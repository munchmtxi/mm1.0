'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const customerConstants = require('@constants/customer/customerConstants');

/** Validates analytics access */
const validateAnalyticsAccess = catchAsync(async (req, res, next) => {
  const customerId = req.params.customerId || req.body.customer_id;
  const userId = req.user.id;

  logger.info('Validating analytics access', { customerId, userId });

  const { Customer } = require('@models');
  const customer = await Customer.findOne({ where: { user_id: customerId } });

  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.find(code => code === 'CUSTOMER_NOT_FOUND'));
  }

  if (customer.user_id !== userId) {
    throw new AppError('Forbidden', 403, customerConstants.ERROR_CODES.find(code => code === 'PERMISSION_DENIED'));
  }

  next();
});

module.exports = {
  validateAnalyticsAccess,
};