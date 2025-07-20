'use strict';

const { Driver, User, AccessibilitySettings, sequelize, Vehicle } = require('@models');
const driverConstants = require('@constants/driverConstants');
const vehicleConstants = require('@constants/vehicleConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function setCountry(driverId, country) {
  if (!localizationConstants.SUPPORTED_COUNTRIES.includes(country)) {
    throw new AppError('Invalid country', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await driver.user.update({ country }, { transaction });
    await transaction.commit();
    logger.info('Country updated', { driverId, country });
    return { driverId, country };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set country failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function setLanguage(driverId, language) {
  if (!localizationConstants.SUPPORTED_LANGUAGES.includes(language)) {
    throw new AppError('Invalid language', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await driver.user.update({ preferred_language: language }, { transaction });

    let accessibility = await AccessibilitySettings.findOne({
      where: { user_id: driver.user_id },
      transaction,
    });
    if (accessibility) {
      await accessibility.update({ language }, { transaction });
    } else {
      await AccessibilitySettings.create({
        user_id: driver.user_id,
        language,
        screenReaderEnabled: false,
        fontSize: driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
      }, { transaction });
    }

    await transaction.commit();
    logger.info('Language updated', { driverId, language });
    return { driverId, language };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set language failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function configureAccessibility(driverId, settings) {
  const { screenReaderEnabled, fontSize } = settings;

  if (typeof screenReaderEnabled !== 'boolean') {
    throw new AppError('Invalid screen reader setting', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (fontSize < driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min ||
      fontSize > driverConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max) {
    throw new AppError('Invalid font size', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    let accessibility = await AccessibilitySettings.findOne({
      where: { user_id: driver.user_id },
      transaction,
    });
    if (accessibility) {
      await accessibility.update({ screenReaderEnabled, fontSize }, { transaction });
    } else {
      await AccessibilitySettings.create({
        user_id: driver.user_id,
        screenReaderEnabled,
        fontSize,
        language: driver.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      }, { transaction });
    }

    await transaction.commit();
    logger.info('Accessibility settings updated', { driverId, screenReaderEnabled, fontSize });
    return { driverId, screenReaderEnabled, fontSize };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Configure accessibility failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function updatePrivacySettings(driverId, preferences) {
  const { location_visibility, data_sharing, notifications } = preferences;

  if (location_visibility && !driverConstants.PROFILE_CONSTANTS.PRIVACY_SETTINGS.LOCATION_VISIBILITY.includes(location_visibility)) {
    throw new AppError('Invalid location visibility', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (data_sharing && !driverConstants.PROFILE_CONSTANTS.PRIVACY_SETTINGS.DATA_SHARING.includes(data_sharing)) {
    throw new AppError('Invalid data sharing setting', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (notifications && !Object.keys(notifications).every(key => ['email', 'sms', 'push', 'whatsapp'].includes(key))) {
    throw new AppError('Invalid notification preferences', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const updateData = {};
    if (location_visibility || data_sharing) {
      updateData.privacy_settings = {
        location_visibility: location_visibility || driver.user.privacy_settings?.location_visibility || 'app_only',
        data_sharing: data_sharing || driver.user.privacy_settings?.data_sharing || 'analytics',
      };
    }
    if (notifications) {
      updateData.notification_preferences = {
        ...driver.user.notification_preferences,
        ...notifications,
      };
    }

    await driver.user.update(updateData, { transaction });
    await transaction.commit();
    logger.info('Privacy settings updated', { driverId, preferences });
    return { driverId, preferences };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update privacy settings failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

// New Feature: Configure eco-friendly vehicle settings
async function configureEcoVehicle(driverId, ecoSettings) {
  const { vehicleId, fuelType, evChargingType } = ecoSettings;

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const vehicle = await Vehicle.findOne({ where: { id: vehicleId, driver_id: driverId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404, vehicleConstants.ERROR_CODES.VEHICLE_NOT_FOUND);

  if (fuelType && !vehicleConstants.VEHICLE_SETTINGS.FUEL_TYPES.includes(fuelType)) {
    throw new AppError('Invalid fuel type', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }
  if (evChargingType && fuelType === 'electric' && !vehicleConstants.VEHICLE_SETTINGS.EV_CHARGING_COMPATIBILITY.includes(evChargingType)) {
    throw new AppError('Invalid EV charging type', 400, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }

  const transaction = await sequelize.transaction();
  try {
    await vehicle.update({
      fuel_type: fuelType || vehicle.fuel_type,
      ev_charging_type: evChargingType || vehicle.ev_charging_type,
      updated_at: new Date(),
    }, { transaction });

    await driver.update({
      vehicle_info: { ...driver.vehicle_info, fuel_type: fuelType, ev_charging_type: evChargingType },
      updated_at: new Date(),
    }, { transaction });

    await transaction.commit();
    logger.info('Eco vehicle settings updated', { driverId, vehicleId, fuelType, evChargingType });
    return { driverId, vehicleId, fuelType, evChargingType };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Configure eco vehicle failed: ${error.message}`, 500, vehicleConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
  }
}

// New Feature: Set availability schedule
async function setAvailabilitySchedule(driverId, schedule) {
  const { availability } = schedule;

  if (!Array.isArray(availability) || !availability.every(slot => 
    driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.includes(slot.status) &&
    slot.date && slot.start_time && slot.end_time
  )) {
    throw new AppError('Invalid availability schedule', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await sequelize.models.DriverAvailability.destroy({
      where: { driver_id: driverId },
      transaction,
    });

    for (const slot of availability) {
      const { status, date, start_time, end_time } = slot;
      if (new Date(`${date} ${end_time}`) - new Date(`${date} ${start_time}`) < 
          driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MIN_SHIFT_HOURS * 60 * 60 * 1000) {
        throw new AppError('Shift duration too short', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
      }
      await sequelize.models.DriverAvailability.create({
        driver_id: driverId,
        status,
        date,
        start_time,
        end_time,
        last_updated: new Date(),
      }, { transaction });
    }

    await driver.update({
      availability_status: availability[0]?.status || 'unavailable',
      updated_at: new Date(),
    }, { transaction });

    await transaction.commit();
    logger.info('Availability schedule updated', { driverId, schedule });
    return { driverId, schedule };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set availability schedule failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  setCountry,
  setLanguage,
  configureAccessibility,
  updatePrivacySettings,
  configureEcoVehicle,
  setAvailabilitySchedule,
};