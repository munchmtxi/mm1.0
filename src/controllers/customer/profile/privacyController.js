'use strict';

const privacyService = require('@services/customer/privacyService');
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
  async setPrivacySettings(req, res, next) {
    const { userId, body: { location_visibility, data_sharing }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const settings = { location_visibility, data_sharing };
      const result = await privacyService.setPrivacySettings(userId, settings, transaction);

      await pointService.awardPoints(userId, 'privacy_settings_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'privacy_settings_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.privacy_settings_updated',
        messageParams: { settings: Object.keys(settings).join(', ') },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'PRIVACY_SETTINGS_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'PRIVACY_UPDATED',
        details: settings,
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'PRIVACY_UPDATED'),
        details: settings,
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.privacy_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Privacy settings update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Privacy settings update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PRIVACY_UPDATE_FAILED')));
    }
  },

  async manageDataAccess(req, res, next) {
    const { userId, body: { permissions }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await privacyService.manageDataAccess(userId, permissions, transaction);

      await pointService.awardPoints(userId, 'privacy_settings_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'privacy_settings_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.data_access_updated',
        messageParams: { permissions: Object.keys(permissions).join(', ') },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'DATA_ACCESS_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'PRIVACY_UPDATED',
        details: permissions,
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'PRIVACY_UPDATED'),
        details: permissions,
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.privacy_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Data access update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Data access update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'PRIVACY_UPDATE_FAILED')));
    }
  },
};