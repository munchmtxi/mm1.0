'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const meventsConstants = require('@constants/merchant/meventsConstants');
const catchAsync = require('@utils/catchAsync');

const restrictEventAccess = catchAsync(async (req, res, next) => {
  const { role } = req.user;

  if (role !== 'merchant') {
    throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.unauthorized'), 403, meventsConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = { restrictEventAccess };