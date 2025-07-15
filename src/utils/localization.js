'use strict';

/**
 * Localization Utility
 * Loads and formats messages from JSON translation files for notifications and UI across all roles
 * (admin, staff, merchant, driver, customer). Uses supported languages from localization constants.
 * Loads translations from locales/{role}/{module}/{languageCode}.json, supporting nested modules (e.g., payments/wallet).
 */

const fs = require('fs');
const path = require('path');
const localizationConstants = require('@constants/common/localizationConstants');

// Cache for loaded translations
const translationCache = new Map();

/**
 * Retrieves supported languages from localization constants.
 * @returns {Set<string>} Set of unique ISO 639-1 language codes.
 */
function getSupportedLanguages() {
  return new Set(localizationConstants.SUPPORTED_LANGUAGES);
}

/**
 * Determines the default language from localization constants.
 * @returns {string} Default ISO 639-1 language code.
 */
function getDefaultLanguage() {
  return localizationConstants.DEFAULT_LANGUAGE;
}

/**
 * Loads translation file for a given role, module, and language code.
 * @param {string} role - Role identifier (e.g., 'admin', 'staff', 'merchant', 'driver', 'customer').
 * @param {string} module - Module identifier (e.g., 'profile', 'payments/wallet').
 * @param {string} languageCode - ISO 639-1 language code (e.g., 'en', 'es').
 * @returns {Object} Translation object.
 * @throws {Error} If translation file is not found or invalid.
 */
function loadTranslation(role, module, languageCode) {
  const cacheKey = `${role}:${module}:${languageCode}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Handle nested module paths (e.g., 'payments/wallet')
  const modulePath = module.split('/').join(path.sep);
  const filePath = path.join(__dirname, '..', '..', 'locales', role, modulePath, `${languageCode}.json`);
  try {
    const translation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    translationCache.set(cacheKey, translation);
    return translation;
  } catch (error) {
    throw new Error(`Failed to load translation for ${role}/${module}/${languageCode}: ${error.message}`);
  }
}

/**
 * Formats a message based on the specified role, module, language, and parameters.
 * @param {string} role - Role identifier (e.g., 'admin', 'staff', 'merchant', 'driver', 'customer').
 * @param {string} module - Module identifier (e.g., 'profile', 'payments/wallet').
 * @param {string} languageCode - ISO 639-1 language code (e.g., 'en', 'es').
 * @param {string} messageKey - Key of the message to format (supports dot notation, e.g., 'profile.welcome_message').
 * @param {Object} [params={}] - Parameters to inject into the message (e.g., { name: 'John' }).
 * @returns {string} Formatted message.
 */
function formatMessage(role, module, languageCode, messageKey, params = {}) {
  const supportedLanguages = getSupportedLanguages();
  const defaultLanguage = getDefaultLanguage();

  // Validate language code
  if (!supportedLanguages.has(languageCode)) {
    languageCode = defaultLanguage;
  }

  let translation;
  try {
    translation = loadTranslation(role, module, languageCode);
  } catch (error) {
    // Fallback to default language for role/module
    try {
      translation = loadTranslation(role, module, defaultLanguage);
    } catch (fallbackError) {
      // Ultimate fallback to admin/profile/en
      try {
        translation = loadTranslation('admin', 'profile', defaultLanguage);
      } catch (ultimateError) {
        return `Message not found for ${role}/${module}/${messageKey}`;
      }
    }
  }

  // Resolve nested keys
  let message = messageKey.split('.').reduce((obj, key) => obj && obj[key], translation) || translation[messageKey] || 'Message not found';

  // Replace placeholders with params
  Object.keys(params).forEach((key) => {
    message = message.replace(`{${key}}`, params[key]);
  });

  // Apply date/time formatting based on localization settings
  if (params.date) {
    const dateFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    message = message.replace('{date}', new Date(params.date).toLocaleString(languageCode, dateFormatOptions));
  }

  return message;
}

module.exports = {
  formatMessage,
  getSupportedLanguages,
  getDefaultLanguage,
};