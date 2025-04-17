'use strict';

const { Address } = require('@models');
const AppError = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');

module.exports = catchAsync(async (req, res, next) => {
  const { addressData } = req.body;
  if (addressData?.id) {
    const address = await Address.findByPk(addressData.id);
    if (!address || address.user_id !== req.user.id) {
      throw new AppError('Unauthorized to access this address', 403, 'ADDRESS_UNAUTHORIZED');
    }
  }
  next();
});