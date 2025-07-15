'use strict';

const { Driver } = require('@models');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');

async function checkDriverExists(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkDriverExists,
};