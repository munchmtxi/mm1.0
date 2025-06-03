// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\accessibility\accessibilityService.js
'use strict';

const { sequelize, User, Merchant, MerchantBranch, AccessibilitySettings } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const customerConstants = require('@constants/customerConstants');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class AccessibilityService {
  static async enableScreenReaders(merchantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [
          { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
          { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'screenReaderEnabled'] },
        ],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      let accessibilitySettings = merchant.accessibilitySettings;
      if (!accessibilitySettings) {
        accessibilitySettings = await AccessibilitySettings.create({
          user_id: merchantId,
          screenReaderEnabled: true,
          fontSize: customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
          language: merchant.preferred_language,
        }, { transaction });
      } else if (accessibilitySettings.screenReaderEnabled) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.screenReaderAlreadyEnabled'), 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
      } else {
        await accessibilitySettings.update({ screenReaderEnabled: true }, { transaction });
      }

      const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      for (const branch of branches) {
        await branch.update({ preferred_language: merchant.preferred_language }, { transaction });
      }

      const message = formatMessage(merchant.preferred_language, 'accessibility.screenReaderEnabled');
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, action: 'enableScreenReaders' },
        ipAddress,
      }, transaction);

      socketService.emit(`accessibility:screenReaderEnabled:${merchantId}`, { merchantId });

      await transaction.commit();
      logger.info(`Screen readers enabled for merchant ${merchantId}`);
      return { merchantId, screenReaderEnabled: true };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('enableScreenReaders', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async adjustFonts(merchantId, fontSize, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [
          { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
          { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'fontSize'] },
        ],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      if (fontSize < customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min || fontSize > customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidFontSize'), 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }

      let accessibilitySettings = merchant.accessibilitySettings;
      if (!accessibilitySettings) {
        accessibilitySettings = await AccessibilitySettings.create({
          user_id: merchantId,
          screenReaderEnabled: false,
          fontSize,
          language: merchant.preferred_language,
        }, { transaction });
      } else {
        await accessibilitySettings.update({ fontSize }, { transaction });
      }

      const message = formatMessage(merchant.preferred_language, 'accessibility.fontAdjusted', { fontSize });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'LOW',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, fontSize },
        ipAddress,
      }, transaction);

      socketService.emit(`accessibility:fontAdjusted:${merchantId}`, { merchantId, fontSize });

      await transaction.commit();
      logger.info(`Font size adjusted to ${fontSize} for merchant ${merchantId}`);
      return { merchantId, fontSize };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('adjustFonts', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async supportMultiLanguage(merchantId, language, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [
          { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
          { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'language'] },
        ],
        transaction,
      });
      if (!merchant || !merchant.merchant_profile) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      if (!customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES.includes(language)) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidLanguage'), 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }

      let accessibilitySettings = merchant.accessibilitySettings;
      if (!accessibilitySettings) {
        accessibilitySettings = await AccessibilitySettings.create({
          user_id: merchantId,
          screenReaderEnabled: false,
          fontSize: customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
          language,
        }, { transaction });
      } else if (accessibilitySettings.language === language) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.languageAlreadySet'), 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
      } else {
        await accessibilitySettings.update({ language }, { transaction });
      }

      const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction });
      for (const branch of branches) {
        await branch.update({ preferred_language: language }, { transaction });
      }

      await merchant.update({ preferred_language: language }, { transaction });

      const message = formatMessage(merchant.preferred_language, 'accessibility.languageSupported', { language });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, language },
        ipAddress,
      }, transaction);

      socketService.emit(`accessibility:languageSupported:${merchantId}`, { merchantId, language });

      await transaction.commit();
      logger.info(`Language set to ${language} for merchant ${merchantId}`);
      return { merchantId, language };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('supportMultiLanguage', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }

  static async trackAccessibilityGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [
          { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'screenReaderEnabled', 'fontSize', 'language'] },
        ],
      });
      if (!customer) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const settings = customer.accessibilitySettings;
      if (!settings) {
        throw new AppError(formatMessage('merchant', 'accessibility', 'en', 'accessibility.errors.noAccessibilitySettings'), 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
      }

      const points = 
        (settings.screenReaderEnabled ? customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SCREEN_READER_USAGE.points : 0) +
        (settings.fontSize !== customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min ? customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.FONT_ADJUSTMENT.points : 0) +
        (settings.language !== customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE ? customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.LANGUAGE_CHANGE.points : 0);

      if (points > 0) {
        await gamificationService.awardPoints({
          userId: customerId,
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.ACCESSIBILITY_USAGE.action,
          points,
          metadata: {
            screenReader: settings.screenReaderEnabled,
            fontSize: settings.fontSize,
            language: settings.language,
          },
        });

        const message = formatMessage(customer.preferred_language, 'accessibility.pointsAwarded', { points });
        await notificationService.createNotification({
          userId: customerId,
          type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          message,
          priority: 'LOW',
          languageCode: customer.preferred_language,
        });

        socketService.emit(`accessibility:gamification:${customerId}`, { customerId, points });
      }

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, pointsAwarded: points },
        ipAddress,
      });

      logger.info(`Accessibility gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackAccessibilityGamification', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }
  }
}

module.exports = AccessibilityService;