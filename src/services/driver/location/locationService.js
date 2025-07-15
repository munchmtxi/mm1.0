'use strict';

const { Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const locationConstants = require('@constants/locationConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function shareLocation(driverId, coordinates, { pointService, auditService, notificationService, socketService }) {
  const { lat, lng } = coordinates;
  if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
    throw new AppError('Invalid or missing coordinates', 400, locationConstants.ERROR_CODES.INVALID_COORDINATES);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  if (
    driver.availability_status !== driverConstants.DRIVER_STATUSES.AVAILABLE &&
    driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_DELIVERY &&
    driver.availability_status !== driverConstants.DRIVER_STATUSES.ON_RIDE
  ) {
    throw new AppError('Driver not active', 400, locationConstants.ERROR_CODES.DRIVER_NOT_ACTIVE);
  }

  const transaction = await sequelize.transaction();
  try {
    await driver.update(
      { current_location: { lat, lng }, last_location_update: new Date() },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: locationConstants.AUDIT_TYPES.SHARE_LOCATION,
        details: { driverId, coordinates },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const now = new Date();
    const lastPointAward = await pointService.getPointsHistory(driverId, 'location_share', {
      startDate: new Date(now.getTime() - 60 * 1000), // 1 minute ago
      endDate: now,
    });
    if (!lastPointAward.length) {
      await pointService.awardPoints(
        driverId,
        'location_share',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'location_share').points,
        { action: `Shared location at lat: ${lat}, lng: ${lng}` },
        transaction
      );
    }

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: locationConstants.NOTIFICATION_TYPES.LOCATION_UPDATED,
        message: formatMessage(
          'driver',
          'location',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'location.updated',
          { lat, lng }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emit(null, locationConstants.EVENT_TYPES.LOCATION_UPDATED, { driverId, coordinates });

    await transaction.commit();
    logger.info('Location shared', { driverId, coordinates });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Share location failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

async function getLocation(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
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

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: locationConstants.AUDIT_TYPES.GET_LOCATION,
        details: { driverId },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'location_access', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'location_access',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'location_access').points,
        { action: 'Accessed current location' },
        transaction
      );
    }

    socketService.emitToUser(driver.user_id, locationConstants.EVENT_TYPES.LOCATION_RETRIEVED, {
      driverId,
      coordinates: driver.current_location,
      lastUpdated: driver.last_location_update,
    });

    await transaction.commit();
    logger.info('Location retrieved', { driverId });
    return {
      driverId,
      coordinates: driver.current_location,
      lastUpdated: driver.last_location_update,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Location retrieval failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

async function configureMap(driverId, country, { pointService, auditService, notificationService, socketService }) {
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: locationConstants.AUDIT_TYPES.CONFIGURE_MAP,
        details: { driverId, country, mapProvider },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'map_configure',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'map_configure').points,
      { action: `Configured map for ${country} with ${mapProvider}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: locationConstants.NOTIFICATION_TYPES.MAP_CONFIGURED,
        message: formatMessage(
          'driver',
          'location',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'map.configured',
          { country, provider: mapProvider }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, locationConstants.EVENT_TYPES.MAP_CONFIGURED, {
      driverId,
      country,
      mapProvider,
    });

    await transaction.commit();
    logger.info('Map configured', { driverId, country, mapProvider });
    return mapConfig;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Map configuration failed: ${error.message}`, 500, locationConstants.ERROR_CODES.LOCATION_UPDATE_FAILED);
  }
}

module.exports = {
  shareLocation,
  getLocation,
  configureMap,
};