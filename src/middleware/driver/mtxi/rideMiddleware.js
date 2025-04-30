'use strict';

const { Driver } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const restrictRideDriver = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') {
      logger.warn('User lacks driver role', { userId: req.user.id, role: req.user.role });
      throw new AppError('Unauthorized: Driver role required', 403, 'UNAUTHORIZED');
    }

    const driver = await Driver.findOne({
      where: { user_id: req.user.id, deleted_at: null },
    });
    if (!driver) {
      logger.warn('Driver not found', { userId: req.user.id });
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }

    if (driver.status !== 'active' || driver.availability_status === 'unavailable') {
      logger.warn('Driver not eligible to manage rides', {
        userId: req.user.id,
        status: driver.status,
        availability: driver.availability_status,
      });
      throw new AppError('Unauthorized: Driver not active or available', 403, 'UNAUTHORIZED');
    }

    req.driver = driver;
    next();
  } catch (error) {
    logger.error('restrictRideDriver error', { error: error.message, userId: req.user.id });
    next(error);
  }
};

module.exports = { restrictRideDriver };