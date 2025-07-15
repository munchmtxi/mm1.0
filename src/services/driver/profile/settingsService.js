'use strict';

const { Driver, User, AccessibilitySettings, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const authConstants = require('@constants/common/authConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function setCountry(driverId, country, auditService, notificationService, socketService, pointService) {
  if (!authConstants.AUTH_SETTINGS.SUPPORTED_COUNTRIES.includes(country)) {
    throw new AppError('Invalid country', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await driver.user.update({ country }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'SET_COUNTRY',
      details: { driverId, country },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'profile',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.country_updated',
        { country }
      ),
      priority: 'LOW',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'settings_update').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'settings:country_updated', { driverId, country });

    await transaction.commit();
    logger.info('Country updated', { driverId, country });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set country failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function setLanguage(driverId, language, auditService, notificationService, socketService, pointService) {
  if (!driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES.includes(language)) {
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

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'SET_LANGUAGE',
      details: { driverId, language },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'profile',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.language_updated',
        { language }
      ),
      priority: 'LOW',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'settings_update').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'settings:language_updated', { driverId, language });

    await transaction.commit();
    logger.info('Language updated', { driverId, language });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Set language failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function configureAccessibility(driverId, settings, auditService, notificationService, socketService, pointService) {
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
        language: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      }, { transaction });
    }

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'CONFIGURE_ACCESSIBILITY',
      details: { driverId, screenReaderEnabled, fontSize },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'profile',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.accessibility_updated'
      ),
      priority: 'LOW',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'settings_update').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'settings:accessibility_updated', {
      driverId,
      screenReaderEnabled,
      fontSize,
    });

    await transaction.commit();
    logger.info('Accessibility settings updated', { driverId, screenReaderEnabled, fontSize });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Configure accessibility failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function updatePrivacySettings(driverId, preferences, auditService, notificationService, socketService, pointService) {
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

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_PRIVACY_SETTINGS',
      details: { driverId, preferences },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SCHEDULE_UPDATE,
      message: formatMessage(
        'driver',
        'profile',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.privacy_updated'
      ),
      priority: 'LOW',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'settings_update').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'settings:privacy_updated', { driverId, preferences });

    await transaction.commit();
    logger.info('Privacy settings updated', { driverId, preferences });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update privacy settings failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  setCountry,
  setLanguage,
  configureAccessibility,
  updatePrivacySettings,
};