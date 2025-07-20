'use strict';

/**
 * Validation Utility
 * Provides functions to validate admin profile data, localization settings, accessibility settings,
 * and payment methods. Uses constants from adminCoreConstants, adminSystemConstants, and paymentConstants.
 */

const validator = require('validator');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');
const paymentConstants = require('@constants/common/paymentConstants');

/**
 * Validates admin data for creation or update.
 * @param {Object} data - Admin data (name, email, password, countryCode, languageCode, roleId, notificationPreferences).
 * @param {boolean} isCreate - True if creating a new admin, false for updates.
 * @throws {Error} If validation fails.
 */
async function validateAdminData(data, isCreate) {
  if (isCreate) {
    if (!data.name || !validator.isLength(data.name, { min: 2, max: 100 })) {
      throw new Error('Name is required and must be 2-100 characters');
    }
    if (!data.email || !validator.isEmail(data.email)) {
      throw new Error('Valid email is required');
    }
    if (!data.password || !validator.isLength(data.password, { min: adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH })) {
      throw new Error(`Password must be at least ${adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_MINIMUM_LENGTH} characters`);
    }
    if (!data.roleId || !validator.isInt(data.roleId.toString())) {
      throw new Error('Valid role ID is required');
    }
  } else {
    if (data.name && !validator.isLength(data.name, { min: 2, max: 100 })) {
      throw new Error('Name must be 2-100 characters');
    }
    if (data.email && !validator.isEmail(data.email)) {
      throw new Error('Valid email is required');
    }
    if (data.password && !validator.isLength(data.password, { min: adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH })) {
      throw new Error(`Password must be at least ${adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_MINIMUM_LENGTH} characters`);
    }
  }

  if (data.countryCode && !adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES.includes(data.countryCode)) {
    throw new Error('Country code must be a supported currency code');
  }

  if (data.languageCode && !adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES.includes(data.languageCode)) {
    throw new Error('Language code must be a supported language code');
  }

  if (data.notificationPreferences) {
    if (typeof data.notificationPreferences !== 'object' ||
        !adminEngagementConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.every(method => method in data.notificationPreferences)) {
      throw new Error('Notification preferences must include all supported delivery methods');
    }
  }
}

/**
 * Validates localization settings.
 * @param {Object} data - Localization data (countryCode, languageCode).
 * @throws {Error} If validation fails.
 */
function validateLocalizationData(data) {
  if (!data.countryCode || !adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES.includes(data.countryCode)) {
    throw new Error('Country code must be a supported currency code');
  }

  if (data.languageCode && !adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES.includes(data.languageCode)) {
    throw new Error('Language code must be a supported language code');
  }
}

/**
 * Validates accessibility settings.
 * @param {Object} settings - Accessibility settings (screenReader, fontSize, highContrast).
 * @throws {Error} If validation fails.
 */
function validateAccessibilitySettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Accessibility settings must be an object');
  }

  if ('screenReader' in settings && typeof settings.screenReader !== 'boolean') {
    throw new Error('screenReader must be a boolean');
  }

  if ('fontSize' in settings) {
    const fontSize = parseInt(settings.fontSize, 10);
    if (isNaN(fontSize) || fontSize < adminSystemConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min || fontSize > adminSystemConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max) {
      throw new Error(`fontSize must be between ${adminSystemConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min} and ${adminSystemConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max}`);
    }
  }

  if ('highContrast' in settings && typeof settings.highContrast !== 'boolean') {
    throw new Error('highContrast must be a boolean');
  }
}

/**
 * Validates payment method details.
 * @param {Object} paymentMethod - Payment method details (type, id, [cardNumber, expiry, cvv]).
 * @throws {Error} If validation fails.
 */
async function validatePaymentMethod(paymentMethod) {
  if (!paymentMethod || typeof paymentMethod !== 'object') {
    throw new Error('Payment method must be an object');
  }

  if (!paymentMethod.type || !Object.values(paymentConstants.PAYMENT_METHODS).includes(paymentMethod.type)) {
    throw new Error('Invalid payment method type');
  }

  if (!paymentMethod.id || !validator.isInt(paymentMethod.id.toString())) {
    throw new Error('Valid payment method ID is required');
  }

  if (['CREDIT_CARD', 'DEBIT_CARD'].includes(paymentMethod.type)) {
    if (!paymentMethod.cardNumber || !validator.isCreditCard(paymentMethod.cardNumber)) {
      throw new Error('Valid card number is required');
    }
    if (!paymentMethod.expiry || !validator.matches(paymentMethod.expiry, /^(0[1-9]|1[0-2])\/[0-9]{2}$/)) {
      throw new Error('Expiry date must be in MM/YY format');
    }
    if (!paymentMethod.cvv || !validator.isInt(paymentMethod.cvv, { min: 100, max: 9999 })) {
      throw new Error('Valid CVV is required');
    }
  }

  if (paymentMethod.type === 'BANK_TRANSFER') {
    if (!paymentMethod.accountNumber || !validator.isAlphanumeric(paymentMethod.accountNumber)) {
      throw new Error('Valid account number is required');
    }
    if (!paymentMethod.routingCode || !validator.isAlphanumeric(paymentMethod.routingCode)) {
      throw new Error('Valid routing code is required');
    }
  }
}

module.exports = {
  validateAdminData,
  validateLocalizationData,
  validateAccessibilitySettings,
  validatePaymentMethod,
};