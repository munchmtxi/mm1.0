'use strict';

const profileService = require('@services/customer/profileService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');

module.exports = {
  async updateProfile(req, res, next) {
    const { userId, body: { phone_number, address }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const profileData = { phone_number, address };
      const result = await profileService.updateProfile(userId, profileData, transaction);

      await pointService.awardPoints(userId, 'profile_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'profile_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.profile_updated',
        messageParams: { fields: Object.keys(profileData).join(', ') },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'PROFILE_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'PROFILE_UPDATED',
        details: result.updatedFields,
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'PROFILE_UPDATED'),
        details: result.updatedFields,
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.profile_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Profile update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Profile update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_UPDATE_FAILED')));
    }
  },

  async setCountry(req, res, next) {
    const { userId, body: { country }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await profileService.setCountry(userId, country, transaction);

      await pointService.awardPoints(userId, 'country_set', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'country_set').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.country_set',
        messageParams: { country },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'COUNTRY_SET', {
        userId,
        role: 'customer',
        auditAction: 'COUNTRY_SET',
        details: { country },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'COUNTRY_SET'),
        details: { country },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.country_set_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Country set failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Country set failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_UPDATE_FAILED')));
    }
  },

  async setLanguage(req, res, next) {
    const { userId, body: { languageCode: requestedLanguage }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await profileService.setLanguage(userId, requestedLanguage, transaction);

      await pointService.awardPoints(userId, 'language_set', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'language_set').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.language_set',
        messageParams: { language: requestedLanguage },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'LANGUAGE_SET', {
        userId,
        role: 'customer',
        auditAction: 'LANGUAGE_SET',
        details: { languageCode: requestedLanguage },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'LANGUAGE_SET'),
        details: { languageCode: requestedLanguage },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.language_set_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Language set failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Language set failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_UPDATE_FAILED')));
    }
  },

  async setDietaryPreferences(req, res, next) {
    const { userId, body: { preferences }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await profileService.setDietaryPreferences(userId, preferences, transaction);

      await pointService.awardPoints(userId, 'dietary_preferences_set', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'dietary_preferences_set').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.dietary_preferences_set',
        messageParams: { preferences: preferences.join(', ') },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'DIETARY_PREFERENCES_SET', {
        userId,
        role: 'customer',
        auditAction: 'DIETARY_PREFERENCES_SET',
        details: { preferences },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'DIETARY_PREFERENCES_SET'),
        details: { preferences },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.dietary_preferences_set_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Dietary preferences set failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Dietary preferences set failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_UPDATE_FAILED')));
    }
  },

  async setDefaultAddress(req, res, next) {
    const { userId, body: { addressId }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await profileService.setDefaultAddress(userId, addressId, transaction);

      await pointService.awardPoints(userId, 'default_address_set', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'default_address_set').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.default_address_set',
        messageParams: { addressId },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'DEFAULT_ADDRESS_SET', {
        userId,
        role: 'customer',
        auditAction: 'DEFAULT_ADDRESS_SET',
        details: { addressId },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'DEFAULT_ADDRESS_SET'),
        details: { addressId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.default_address_set_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Default address set failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Default address set failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_UPDATE_FAILED')));
    }
  },

  async getProfile(req, res, next) {
    const { userId, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await profileService.getProfile(userId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'PROFILE_VIEWED'),
        details: { userId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.get_profile_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Get profile failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Get profile failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PROFILE_RETRIEVAL_FAILED')));
    }
  },
};