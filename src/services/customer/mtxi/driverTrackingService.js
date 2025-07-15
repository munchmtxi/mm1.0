'use strict';

const { Op } = require('sequelize');
const { Driver, DriverAvailability, Ride } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function trackDriver(rideId, transaction) {
  const ride = await Ride.findByPk(rideId, {
    include: [
      { model: Driver, as: 'driver', attributes: ['id', 'current_location', 'user_id'] },
    ],
    transaction,
  });
  if (!ride || !ride.driver) throw new AppError('Ride or driver not found', 404, customerConstants.ERROR_CODES[1]);

  const driverAvailability = await DriverAvailability.findOne({
    where: {
      driver_id: ride.driverId,
      date: sequelize.literal('CURRENT_DATE'),
      start_time: { [Op.lte]: sequelize.literal('CURRENT_TIME') },
      end_time: { [Op.gte]: sequelize.literal('CURRENT_TIME') },
    },
    transaction,
  });
  if (!driverAvailability || driverAvailability.status !== 'available') {
    throw new AppError('Driver not available', 400, customerConstants.ERROR_CODES[1]);
  }

  logger.info('Driver tracked', { rideId, driverId: ride.driverId });
  return {
    driverId: ride.driverId,
    currentLocation: ride.driver.current_location,
    availabilityStatus: driverAvailability.status,
  };
}

async function updateDriverLocation(driverId, coordinates, transaction) {
  const driver = await Driver.findByPk(driverId, { transaction });
  if (!driver) throw new AppError('Driver not found', 404, customerConstants.ERROR_CODES[1]);

  await driver.update(
    {
      current_location: coordinates,
      last_location_update: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Driver location updated', { driverId, coordinates });
  return driver;
}

async function getNearbyDrivers(transaction) {
  const drivers = await Driver.findAll({
    where: {
      availability_status: 'available',
      current_location: { [Op.ne]: null },
    },
    attributes: ['id', 'current_location', 'user_id'],
    transaction,
  });

  logger.info('Nearby drivers retrieved', { count: drivers.length });
  return drivers.map(driver => ({
    driverId: driver.id,
    currentLocation: driver.current_location,
  }));
}

module.exports = {
  trackDriver,
  updateDriverLocation,
  getNearbyDrivers,
};