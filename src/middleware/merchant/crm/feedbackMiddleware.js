'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const merchantConstants = require('@constants/merchantConstants');
const catchAsync = require('@utils/catchAsync');

const restrictFeedbackAccess = catchAsync(async (req, res, next) => {
  const { role } = req.user;

  if (!['merchant', 'customer'].includes(role)) {
    throw new AppError(formatMessage('merchant', 'crm', 'en', 'crm.errors.unauthorized'), 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = { restrictFeedbackAccess };