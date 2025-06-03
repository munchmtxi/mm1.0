'use strict';

/**
 * Localization Utility Helpers
 * Core logic for loading and formatting translations, separated for modularity.
 */

const fs = require('fs');
const path = require('path');

// Cache for loaded translations (role/module/language)
const translationCache = new Map();

/**
 * Loads translation file for a given role, module, and language code.
 * @param {string} role - Role identifier (e.g., 'admin', 'staff', 'customer', 'driver', 'merchant').
 * @param {string} module - Module identifier (e.g., 'profile', 'wallet', 'branch').
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
  const filePath = path.join(__dirname, '..', '..', '..', 'locales', role, modulePath, `${languageCode}.json`);
  try {
    const translation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    translationCache.set(cacheKey, translation);
    return translation;
  } catch (error) {
    throw new Error(`Failed to load translation for ${role}/${module}/${languageCode}: ${error.message}`);
  }
}

/**
 * Formats a message from a translation object.
 * @param {Object} translation - Translation object.
 * @param {string} languageCode - ISO 639-1 language code.
 * @param {string} messageKey - Translation key (supports dot notation, e.g., 'profile.welcome_message').
 * @param {Object} params - Parameters to inject (e.g., { name: 'John' }).
 * @returns {string} Formatted message.
 */
function formatMessage(translation, languageCode, messageKey, params) {
  // Resolve nested keys
  let message = messageKey.split('.').reduce((obj, key) => obj && obj[key], translation) || 'Message not found';

  // Replace placeholders
  Object.keys(params).forEach((key) => {
    message = message.replace(`{${key}}`, params[key]);
  });

  // Apply date/time formatting
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
  loadTranslation,
  formatMessage,
};