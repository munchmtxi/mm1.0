'use strict';

const { Driver, DriverAvailability, Vehicle, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const locationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function shareLocation(driverId, coordinates) {
  const { lat, lng } = coordinates;
  if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
    throw new AppError('Invalid or missing coordinates', 400, locationConstants.ERROR_CODES.INVALID_COORDINATES);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: DriverAvailability, as: 'availability' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const activeAvailability = driver.availability.find(a => a.status === 'available' && a.isOnline);
  if (!activeAvailability && 
      driver.availability_status !== driverConstants.DRIVER_STATUSES.AVAILABLE &&
      driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_DELIVERY &&
      driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_RIDE) {
    throw new AppError('Driver not active', 400, locationConstants.ERROR_CODES.DRIVER_NOT_ACTIVE);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update(
      { current_location: { lat, lng }, last_location_update: new Date() },
      { transaction }
    );

    await transaction.commit();
    logger.info('Location shared', { driverId, coordinates });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Share location failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

async function getLocation(driverId) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!driver.current_location || !driver.last_location_update) {
    throw new AppError('No location data available', 404, locationConstants.ERROR_CODES.NO_LOCATION_DATA);
  }

  const lastUpdate = new Date(driver.last_location_update);
  const now = new Date();
  const secondsSinceUpdate = (now - lastUpdate) / 1000;
  if (secondsSinceUpdate > locationConstants.LOCATION_UPDATE_FREQUENCY_SECONDS) {
    throw new AppError('Location data is outdated', 400, locationConstants.ERROR_CODES.LOCATION_OUTDATED);
  }

  logger.info('Location retrieved', { driverId });
  return {
    driverId,
    coordinates: driver.current_location,
    lastUpdated: driver.last_location_update,
    vehicle: driver.vehicles?.[0]?.type || null,
  };
}

async function configureMap(driverId, country) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!Object.keys(locationConstants.SUPPORTED_MAP_PROVIDERS).includes(country)) {
    throw new AppError('Unsupported country', 400, locationConstants.ERROR_CODES.UNSUPPORTED_COUNTRY);
  }

  const transaction = await sequelize.transaction();
  try {
    const mapProvider = locationConstants.SUPPORTED_MAP_PROVIDERS[country];
    const mapConfig = {
      provider: mapProvider,
      zoomLevel: locationConstants.MAP_SETTINGS.DEFAULT_ZOOM_LEVEL,
      maxWaypoints: locationConstants.MAP_SETTINGS.MAX_WAYPOINTS_PER_ROUTE,
      supportedCities: locationConstants.SUPPORTED_CITIES[country] || [],
    };

    await driver.update({ service_area: { country, mapProvider } }, { transaction });

    await transaction.commit();
    logger.info('Map configured', { driverId, country, mapProvider });
    return mapConfig;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Map configuration failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

async function updatePreferredZones(driverId, zones) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: DriverAvailability, as: 'availability' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!Array.isArray(zones) || !zones.every(z => locationConstants.SUPPORTED_CITIES[driver.service_area?.country]?.includes(z))) {
    throw new AppError('Invalid or unsupported zones', 400, locationConstants.ERROR_CODES.UNSUPPORTED_COUNTRY);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update({ preferred_zones: zones }, { transaction });

    await DriverAvailability.update(
      { lastUpdated: new Date() },
      { where: { driver_id: driverId, status: 'available' }, transaction }
    );

    await transaction.commit();
    logger.info('Preferred zones updated', { driverId, zones });
    return { driverId, preferred_zones: zones };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Preferred zones update failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

async function assignVehicleForLocation(driverId, vehicleId) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle || vehicle.driver_id !== driverId) {
    throw new AppError('Vehicle not found or not assigned to driver', 404, vehicleConstants.ERROR_CODES.VEHICLE_NOT_FOUND);
  }

  if (!vehicleConstants.VEHICLE_STATUSES.includes('active')) {
    throw new AppError('Vehicle not active', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_STATUS);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update({ vehicle_info: { id: vehicle.id, type: vehicle.type, capacity: vehicle.capacity } }, { transaction });

    await transaction.commit();
    logger.info('Vehicle assigned for location', { driverId, vehicleId });
    return { driverId, vehicle: { id: vehicle.id, type: vehicle.type } };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Vehicle assignment failed: ${error.message}`, 500, vehicleConstants.ERROR_CODES.VEHICLE_NOT_FOUND);
  }
}

module.exports = {
  shareLocation,
  getLocation,
  configureMap,
  updatePreferredZones,
  assignVehicleForLocation,
};