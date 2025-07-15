'use strict';

const { Driver } = require('@models');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');

async function checkDriverExists(req, res, next) {
  try {
    const driverId = parseInt(req.body.id || req.user.driverId, 10);
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES[0]); // 'DRIVER_NOT_FOUND'
    }
    req.user.driverId = driverId; // Ensure consistent driverId
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkDriverExists,
};