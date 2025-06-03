'use strict';

/**
 * Localization Utility
 * Provides a generic interface for loading and formatting translations for any role
 * (e.g., admin, staff, customer, driver, merchant) and module (e.g., profile, wallet).
 * Supports dynamic paths and nested keys with a robust fallback mechanism.
 */

const { formatMessage, loadTranslation } = require('./utils');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const staffSystemConstants = require('@constants/staff/staffSystemConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const driverConstants = require('@constants/driver/driverConstants');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Aggregates supported languages from all role constants.
 * @returns {Set<string>} Set of unique ISO 639-1 language codes.
 */
function getSupportedLanguages() {
  return new Set([
    ...adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES,
    ...staffSystemConstants.STAFF_SETTINGS.SUPPORTED_LANGUAGES,
    ...merchantConstants.BRANCH_SETTINGS.SUPPORTED_LANGUAGES,
    ...driverConstants.DRIVER_SETTINGS.SUPPORTED_LANGUAGES,
    ...customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES,
  ]);
}

/**
 * Returns the default language for fallback.
 * @returns {string} Default ISO 639-1 language code ('en').
 */
function getDefaultLanguage() {
  return 'en';
}

/**
 * Formats a message for a given role, module, language, and key.
 * @param {string} role - Role identifier (e.g., 'admin', 'staff', 'customer', 'driver', 'merchant').
 * @param {string} module - Module identifier (e.g., 'profile', 'wallet', 'branch').
 * @param {string} languageCode - ISO 639-1 language code (e.g., 'en', 'es').
 * @param {string} messageKey - Translation key (e.g., 'welcome_message' or 'profile.welcome_message').
 * @param {Object} [params={}] - Parameters to inject (e.g., { name: 'John' }).
 * @returns {string} Formatted message.
 */
function formatMessage(role, module, languageCode, messageKey, params = {}) {
  const supportedLanguages = getSupportedLanguages();
  const defaultLanguage = getDefaultLanguage();

  // Validate language code
  if (!supportedLanguages.has(languageCode)) {
    languageCode = defaultLanguage;
  }

  try {
    const translation = loadTranslation(role, module, languageCode);
    return formatMessage(translation, languageCode, messageKey, params);
  } catch (error) {
    // Fallback to default language for role/module
    try {
      const fallbackTranslation = loadTranslation(role, module, defaultLanguage);
      return formatMessage(fallbackTranslation, defaultLanguage, messageKey, params);
    } catch (fallbackError) {
      // Ultimate fallback to 'admin/profile/en'
      try {
        const ultimateFallback = loadTranslation('admin', 'profile', 'en');
        return formatMessage(ultimateFallback, 'en', messageKey, params);
      } catch (ultimateError) {
        return `Message not found for ${role}/${module}/${messageKey}`;
      }
    }
  }
}

module.exports = {
  formatMessage,
  getSupportedLanguages,
  getDefaultLanguage,
};