'use strict';

const { sequelize, User, Merchant, MerchantBranch, AccessibilitySettings } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function enableScreenReaders(merchantId, ipAddress, transaction = null) {
  const t = transaction || await sequelize.transaction();
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [
        { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
        { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'screenReaderEnabled'] },
      ],
      transaction: t,
    });

    if (!merchant || !merchant.merchant_profile) {
      throw new AppError('Invalid merchant', 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    let accessibilitySettings = merchant.accessibilitySettings;
    if (!accessibilitySettings) {
      accessibilitySettings = await AccessibilitySettings.create({
        user_id: merchantId,
        screenReaderEnabled: true,
        fontSize: merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
        language: merchant.preferred_language,
      }, { transaction: t });
    } else if (accessibilitySettings.screenReaderEnabled) {
      throw new AppError('Screen reader already enabled', 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
    } else {
      await accessibilitySettings.update({ screenReaderEnabled: true }, { transaction: t });
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction: t });
    for (const branch of branches) {
      await branch.update({ preferred_language: merchant.preferred_language }, { transaction: t });
    }

    if (!transaction) await t.commit();
    logger.info(`Screen readers enabled for merchant ${merchantId}`);
    return { merchantId, screenReaderEnabled: true, language: merchant.preferred_language, action: 'screenReaderEnabled' };
  } catch (error) {
    if (!transaction) await t.rollback();
    throw handleServiceError('enableScreenReaders', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function adjustFonts(merchantId, fontSize, ipAddress, transaction = null) {
  const t = transaction || await sequelize.transaction();
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [
        { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
        { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'fontSize'] },
      ],
      transaction: t,
    });

    if (!merchant || !merchant.merchant_profile) {
      throw new AppError('Invalid merchant', 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    if (fontSize < merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min || fontSize > merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max) {
      throw new AppError('Invalid font size', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    let accessibilitySettings = merchant.accessibilitySettings;
    const previousFontSize = accessibilitySettings ? accessibilitySettings.fontSize : merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min;
    if (!accessibilitySettings) {
      accessibilitySettings = await AccessibilitySettings.create({
        user_id: merchantId,
        screenReaderEnabled: false,
        fontSize,
        language: merchant.preferred_language,
      }, { transaction: t });
    } else {
      await accessibilitySettings.update({ fontSize }, { transaction: t });
    }

    if (!transaction) await t.commit();
    logger.info(`Font size adjusted to ${fontSize} for merchant ${merchantId}`);
    return { merchantId, fontSize, previousFontSize, language: merchant.preferred_language, action: 'fontAdjusted' };
  } catch (error) {
    if (!transaction) await t.rollback();
    throw handleServiceError('adjustFonts', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function supportMultiLanguage(merchantId, language, ipAddress, transaction = null) {
  const t = transaction || await sequelize.transaction();
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [
        { model: Merchant, as: 'merchant_profile', attributes: ['id'] },
        { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'language'] },
      ],
      transaction: t,
    });

    if (!merchant || !merchant.merchant_profile) {
      throw new AppError('Invalid merchant', 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    if (!localizationConstants.SUPPORTED_LANGUAGES.includes(language)) {
      throw new AppError('Invalid language', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    let accessibilitySettings = merchant.accessibilitySettings;
    const previousLanguage = accessibilitySettings ? accessibilitySettings.language : merchant.preferred_language;
    if (!accessibilitySettings) {
      accessibilitySettings = await AccessibilitySettings.create({
        user_id: merchantId,
        screenReaderEnabled: false,
        fontSize: merchantConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
        language,
      }, { transaction: t });
    } else if (accessibilitySettings.language === language) {
      throw new AppError('Language already set', 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
    } else {
      await accessibilitySettings.update({ language }, { transaction: t });
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchant.merchant_profile.id }, transaction: t });
    for (const branch of branches) {
      await branch.update({ preferred_language: language }, { transaction: t });
    }

    await merchant.update({ preferred_language: language }, { transaction: t });

    if (!transaction) await t.commit();
    logger.info(`Language set to ${language} for merchant ${merchantId}`);
    return { merchantId, language, previousLanguage, action: 'languageSupported' };
  } catch (error) {
    if (!transaction) await t.rollback();
    throw handleServiceError('supportMultiLanguage', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function calculateAccessibilityPoints(userId, action, metadata = {}) {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'preferred_language', 'role_id'],
      include: [
        { model: AccessibilitySettings, as: 'accessibilitySettings', attributes: ['id', 'screenReaderEnabled', 'fontSize', 'language'] },
      ],
    });

    if (!user) {
      throw new AppError('Invalid user', 404, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    const settings = user.accessibilitySettings;
    if (!settings) {
      throw new AppError('No accessibility settings found', 404, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const actionConfig = merchantConstants.GAMIFICATION_CONSTANTS.GAMIFICATION_ACTIONS.find(a => a.action === action);
    if (!actionConfig) {
      throw new AppError('Invalid action', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    let points = actionConfig.points;
    let multipliers = 1;

    // Apply dynamic multipliers based on action context
    if (action === 'screenReaderEnabled' && settings.screenReaderEnabled) {
      multipliers *= actionConfig.multipliers?.screenReader || 1;
    }
    if (action === 'fontAdjusted' && metadata.fontSize && metadata.previousFontSize) {
      const sizeChange = Math.abs(metadata.fontSize - metadata.previousFontSize);
      multipliers *= actionConfig.multipliers?.fontChange * sizeChange || 1;
    }
    if (action === 'languageSupported' && metadata.language && metadata.language !== localizationConstants.DEFAULT_LANGUAGE) {
      multipliers *= actionConfig.multipliers?.languageChange || 1;
    }

    // Apply role-based multiplier
    const role = user.role_id ? 'merchant' : 'user'; // Simplified role check
    multipliers *= actionConfig.multipliers?.[role] || 1;

    // Cap points to prevent abuse
    points = Math.min(points * multipliers, merchantConstants.GAMIFICATION_CONSTANTS.GAMIFICATION_SETTINGS.MAX_POINTS_PER_ACTION || 100);

    return { userId, points, language: user.preferred_language, action, metadata, role };
  } catch (error) {
    throw handleServiceError('calculateAccessibilityPoints', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { enableScreenReaders, adjustFonts, supportMultiLanguage, calculateAccessibilityPoints };