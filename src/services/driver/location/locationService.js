'use strict';

/**
 * Driver Location Service
 * Manages driver location operations, including sharing real-time location,
 * retrieving current location, and configuring country-specific maps.
 */

const { Driver, sequelize } = require('@models');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Shares real-time driver location.
 * @param {number} driverId - Driver ID.
 * @param {Object} coordinates - Coordinates { lat, lng }.
 * @returns {Promise<void>}
 */
async function shareLocation(driverId, coordinates) {
  const { lat, lng } = coordinates;
  if (!lat || !lng) {
    throw new AppError('Missing coordinates', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (driver.availability_status !== driverConstants.DRIVER_STATUSES.AVAILABLE &&
      driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_DELIVERY &&
      driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_RIDE) {
    throw new AppError('Driver not active', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update(
      { current_location: { lat, lng }, last_location_update: new Date() },
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'SHARE_LOCATION',
      details: { driverId, coordinates },
      ipAddress: 'unknown',
    });

    socketService.emit(null, 'location:updated', { driverId, coordinates });

    await transaction.commit();
    logger.info('Location shared', { driverId, coordinates });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Share location failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

/**
 * Retrieves driver's current location.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Current location details.
 */
async function getLocation(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!driver.current_location || !driver.last_location_update) {
    throw new AppError('No location data available', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  // Check if location is stale (older than LOCATION_UPDATE_FREQUENCY_SECONDS)
  const lastUpdate = new Date(driver.last_location_update);
  const now = new Date();
  const secondsSinceUpdate = (now - lastUpdate) / 1000;
  if (secondsSinceUpdate > driverConstants.LOCATION_CONSTANTS.LOCATION_UPDATE_FREQUENCY_SECONDS) {
    throw new AppError('Location data is outdated', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  logger.info('Location retrieved', { driverId });
  return {
    driverId,
    coordinates: driver.current_location,
    lastUpdated: driver.last_location_update,
  };
}

/**
 * Configures country-specific map provider.
 * @param {number} driverId - Driver ID.
 * @param {string} country - Country code (e.g., 'US', 'KE').
 * @returns {Promise<Object>} Map configuration.
 */
async function configureMap(driverId, country) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (!Object.keys(driverConstants.DRIVER_SETTINGS.SUPPORTED_MAP_PROVIDERS).includes(country)) {
    throw new AppError('Unsupported country', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const mapProvider = driverConstants.DRIVER_SETTINGS.SUPPORTED_MAP_PROVIDERS[country];
  const mapConfig = {
    provider: mapProvider,
    zoomLevel: driverConstants.LOCATION_CONSTANTS.MAP_SETTINGS.DEFAULT_ZOOM_LEVEL,
    maxWaypoints: driverConstants.LOCATION_CONSTANTS.MAP_SETTINGS.MAX_WAYPOINTS_PER_ROUTE,
    supportedCities: driverConstants.DRIVER_SETTINGS.SUPPORTED_CITIES[country] || [],
  };

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'CONFIGURE_MAP',
    details: { driverId, country, mapProvider },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
    message: formatMessage(
      'driver',
      'location',
      driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      'map.configured',
      { country, provider: mapProvider }
    ),
    priority: 'LOW',
  });

  logger.info('Map configured', { driverId, country, mapProvider });
  return mapConfig;
}

module.exports = {
  shareLocation,
  getLocation,
  configureMap,
};