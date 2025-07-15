'use strict';

const settingsService = require('@services/driver/profile/settingsService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function setCountry(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { country } = req.body;
    await settingsService.setCountry(driverId, country, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'profile',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.country_updated',
        { country }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function setLanguage(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { language } = req.body;
    await settingsService.setLanguage(driverId, language, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'profile',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.language_updated',
        { language }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function configureAccessibility(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const settings = req.body;
    await settingsService.configureAccessibility(driverId, settings, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'profile',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.accessibility_updated'
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function updatePrivacySettings(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const preferences = req.body;
    await settingsService.updatePrivacySettings(driverId, preferences, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'profile',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'settings.privacy_updated'
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  setCountry,
  setLanguage,
  configureAccessibility,
  updatePrivacySettings,
};