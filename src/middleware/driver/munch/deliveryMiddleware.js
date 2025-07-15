'use strict';

const { Driver } = require('@models');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');

async function checkDriverStatus(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const driver = await Driver.findByPk(driverId);
    if (!driver || driver.availability_status !== 'available') {
      throw new AppError('Driver not available', 403, driverConstants.ERROR_CODES.DRIVER_NOT_ACTIVE);
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkDriverStatus,
};