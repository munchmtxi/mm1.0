'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const merchantConstants = require('@constants/merchantConstants');
const catchAsync = require('@utils/catchAsync');

const restrictCRMAccess = catchAsync(async (req, res, next) => {
  const { role } = req.user;

  if (role !== 'merchant') {
    throw AppError(formatMessage('merchant', 'crm', 'en', 'crm.errors.unauthorized'), 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
    }

  next();
});

module.exports = { restrictCRMAccess };