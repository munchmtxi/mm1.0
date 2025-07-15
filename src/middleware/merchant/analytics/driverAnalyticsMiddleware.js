'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const merchantConstants = require('@constants/merchantConstants');
const catchAsync = require('@utils/catchAsync');

const restrictDriverAnalyticsAccess = catchAsync(async (req, res, next) => {
  const { role } = req.user;
  const { driverId } = req.params;

  if (role !== 'merchant') {
    throw new AppError(formatMessage('merchant', 'analytics', 'en', 'analytics.errors.unauthorized'), 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = { restrictDriverAnalyticsAccess };