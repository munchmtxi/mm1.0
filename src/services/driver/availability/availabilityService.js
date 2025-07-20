'use strict';

const { Driver, DriverAvailability, Vehicle, DriverRatings, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function setAvailability(driverId, hours) {
  const { date, start_time, end_time } = hours;
  if (!date || !start_time || !end_time) {
    throw new AppError('Missing availability details', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Vehicle, as: 'vehicles' },
      { model: DriverRatings, as: 'ratings' },
    ],
  });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (driver.vehicles.length === 0) {
    throw new AppError('No vehicle assigned', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  if (!driverConstants.DRIVER_STATUSES.includes(driver.status)) {
    throw new AppError('Invalid driver status', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const durationHours = (new Date(`1970-01-01T${end_time}`) - new Date(`1970-01-01T${start_time}`)) / (1000 * 60 * 60);
  if (durationHours < driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS) {
    throw new AppError(
      `Availability duration must be at least ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.INVALID_DRIVER
    );
  }
  if (durationHours > driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS) {
    throw new AppError(
      `Availability duration cannot exceed ${driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS} hours`,
      400,
      driverConstants.ERROR_CODES.INVALID_DRIVER
    );
  }

  const transaction = await sequelize.transaction();
  try {
    const [availability, created] = await DriverAvailability.findOrCreate({
      where: { driver_id: driverId, date },
      defaults: {
        driver_id: driverId,
        date,
        start_time,
        end_time,
        status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE,
        isOnline: true,
        lastUpdated: new Date(),
      },
      transaction,
    });

    if (!created) {
      await availability.update(
        {
          start_time,
          end_time,
          status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE,
          isOnline: true,
          lastUpdated: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();
    logger.info('Availability set', { driverId, date });
    return availability;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getAvailability(driverId) {
  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Vehicle, as: 'vehicles' },
      { model: DriverRatings, as: 'ratings' },
    ],
  });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const today = new Date().toISOString().split('T')[0];
  const availability = await DriverAvailability.findOne({
    where: { driver_id: driverId, date: today },
    order: [['lastUpdated', 'DESC']],
  });

  logger.info('Availability retrieved', { driverId });
  return {
    driverId,
    availabilityStatus: driver.availability_status,
    currentAvailability: availability
      ? {
          date: availability.date,
          start_time: availability.start_time,
          end_time: availability.end_time,
          status: availability.status,
          isOnline: availability.isOnline,
        }
      : null,
    vehicleCount: driver.vehicles.length,
    averageRating: driver.ratings.length > 0
      ? driver.ratings.reduce((sum, r) => sum + Number(r.rating), 0) / driver.ratings.length
      : null,
  };
}

async function toggleAvailability(driverId, isAvailable) {
  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Vehicle, as: 'vehicles' },
      { model: DriverRatings, as: 'ratings' },
    ],
  });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (driver.vehicles.length === 0) {
    throw new AppError('No vehicle assigned', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const newStatus = isAvailable
    ? driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.AVAILABLE
    : driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.UNAVAILABLE;
  if (driver.availability_status === newStatus) {
    throw new AppError(`Driver already ${newStatus}`, 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update({ availability_status: newStatus, updated_at: new Date() }, { transaction });

    const today = new Date().toISOString().split('T')[0];
    await DriverAvailability.update(
      { isOnline: isAvailable, status: newStatus, lastUpdated: new Date() },
      { where: { driver_id: driverId, date: today }, transaction }
    );

    await transaction.commit();
    logger.info('Availability toggled', { driverId, isAvailable });
    return { driverId, availabilityStatus: newStatus };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Toggle availability failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

module.exports = {
  setAvailability,
  getAvailability,
  toggleAvailability,
};