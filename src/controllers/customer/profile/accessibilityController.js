'use strict';

const accessibilityService = require('@services/customer/accessibilityService');
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
  async enableScreenReaders(req, res, next) {
    const { userId, body: { enabled }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await accessibilityService.enableScreenReaders(userId, enabled, transaction);

      await pointService.awardPoints(userId, 'accessibility_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'accessibility_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.accessibility_screen_reader_updated',
        messageParams: { enabled },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'SCREEN_READERS_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'ACCESSIBILITY_UPDATED',
        details: { enabled },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'ACCESSIBILITY_UPDATED'),
        details: { enabled },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.accessibility_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Screen reader update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Screen reader update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'ACCESSIBILITY_UPDATE_FAILED')));
    }
  },

  async adjustFonts(req, res, next) {
    const { userId, body: { fontSize }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await accessibilityService.adjustFonts(userId, fontSize, transaction);

      await pointService.awardPoints(userId, 'accessibility_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'accessibility_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.accessibility_font_size_updated',
        messageParams: { fontSize },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'FONT_SIZE_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'ACCESSIBILITY_UPDATED',
        details: { fontSize },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'ACCESSIBILITY_UPDATED'),
        details: { fontSize },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.accessibility_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Font size update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Font size update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'ACCESSIBILITY_UPDATE_FAILED')));
    }
  },

  async supportMultiLanguage(req, res, next) {
    const { userId, body: { language }, languageCode = customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE } = req;
    const transaction = await req.app.get('sequelize').transaction();
    try {
      const result = await accessibilityService.supportMultiLanguage(userId, language, transaction);

      await pointService.awardPoints(userId, 'accessibility_updated', customerGamificationConstants.GAMIFICATION_ACTIONS.profile.find(a => a.action === 'accessibility_updated').points, {
        io: req.app.get('io'),
        role: 'customer',
        languageCode,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'profile.accessibility_language_updated',
        messageParams: { language },
        role: 'customer',
        module: 'profile',
        languageCode,
      });

      await socketService.emit(req.app.get('io'), 'ACCESSIBILITY_LANGUAGE_UPDATED', {
        userId,
        role: 'customer',
        auditAction: 'ACCESSIBILITY_UPDATED',
        details: { language },
      }, `customer:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(type => type === 'ACCESSIBILITY_UPDATED'),
        details: { language },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'profile', languageCode, 'profile.accessibility_updated_success'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Accessibility language update failed', { userId, error: error.message });
      next(error instanceof AppError ? error : new AppError('Accessibility language update failed', 500, customerConstants.ERROR_CODES.find(code => code === 'ACCESSIBILITY_UPDATE_FAILED')));
    }
  },
};