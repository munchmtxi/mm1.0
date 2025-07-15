'use strict';

const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const merchantConstants = require('@constants/merchant/merchantConstants');
const catchAsync = require('@utils/catchAsync');

const restrictBranchMenuAccess = catchAsync(async (req, res, next) => {
  const { role } = req.user;

  if (role !== 'merchant') {
    throw new AppError(formatMessage('merchant', 'menu', 'en', 'branchMenu.errors.unauthorized'), 403, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
  }

  next();
});

module.exports = { restrictBranchMenuAccess };