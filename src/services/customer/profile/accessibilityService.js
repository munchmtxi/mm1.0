'use strict';

const { Customer, AccessibilitySettings } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function enableScreenReaders(userId, enabled, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  if (typeof enabled !== 'boolean') {
    throw new AppError('Invalid screen reader setting', 400, customerConstants.ERROR_CODES[0]);
  }

  let accessibilitySettings = await AccessibilitySettings.findOne({ where: { user_id: userId }, transaction });
  if (accessibilitySettings) {
    await accessibilitySettings.update({ screenReaderEnabled: enabled, updated_at: new Date() }, { transaction });
  } else {
    accessibilitySettings = await AccessibilitySettings.create({
      user_id: userId,
      screenReaderEnabled: enabled,
      fontSize: customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
      language: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });
  }

  logger.info('Screen reader settings updated', { userId });
  return { userId, screenReaderEnabled: accessibilitySettings.screenReaderEnabled };
}

async function adjustFonts(userId, fontSize, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  const { min, max } = customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE;
  if (typeof fontSize !== 'number' || fontSize < min || fontSize > max) {
    throw new AppError('Invalid font size', 400, customerConstants.ERROR_CODES[0]);
  }

  let accessibilitySettings = await AccessibilitySettings.findOne({ where: { user_id: userId }, transaction });
  if (accessibilitySettings) {
    await accessibilitySettings.update({ fontSize, updated_at: new Date() }, { transaction });
  } else {
    accessibilitySettings = await AccessibilitySettings.create({
      user_id: userId,
      screenReaderEnabled: false,
      fontSize,
      language: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });
  }

  logger.info('Font size updated', { userId });
  return { userId, fontSize: accessibilitySettings.fontSize };
}

async function supportMultiLanguage(userId, language, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  if (!customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES.includes(language)) {
    throw new AppError('Invalid language', 400, customerConstants.ERROR_CODES[0]);
  }

  let accessibilitySettings = await AccessibilitySettings.findOne({ where: { user_id: userId }, transaction });
  if (accessibilitySettings) {
    await accessibilitySettings.update({ language, updated_at: new Date() }, { transaction });
  } else {
    accessibilitySettings = await AccessibilitySettings.create({
 user_id: userId,
      screenReaderEnabled: false,
      fontSize: customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
      language,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });
  }

  logger.info('Language updated', { userId });
  return { userId, language: accessibilitySettings.language };
}

module.exports = { enableScreenReaders, adjustFonts, supportMultiLanguage };