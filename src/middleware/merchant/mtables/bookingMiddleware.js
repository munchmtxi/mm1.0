'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const catchAsync = require('@utils/catchAsync');

const restrictBookingAccess = catchAsync(async (req, req, res, next) => {
  const { role } = req.user;

  if (req.role !== 'merchant' && role !== 'customer') {
    throw new AppError(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.unauthorized'), 403, mtablesConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = { restrictBookingAccess };