'use strict';

/**
 * templateService.js
 *
 * Service for loading and rendering role-specific templates from the filesystem.
 * Integrates with localizationService for localized content.
 *
 * Dependencies:
 * - fs (Node.js file system module)
 * - path (Node.js path module)
 * - localizationService (for fallback message formatting)
 * - logger (custom logging)
 * - AppError (custom error handling)
 *
 * Last Updated: July 19, 2025
 */

const fs = require('fs').promises;
const path = require('path');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const localizationConstants = require('@constants/common/localizationConstants');

class TemplateService {
  constructor() {
    this.basePath = path.join('C:', 'Users', 'munch', 'Desktop', 'MMFinale', 'System', 'Back', 'MM1.0', 'templates');
    this.validRoles = ['staff', 'merchant', 'driver', 'customer', 'admin'];
  }

  /**
   * Loads and renders a template for the given role and language.
   * @param {string} templateName - Name of the template file (e.g., 'order_confirmation.html').
   * @param {string} role - User role (staff, merchant, driver, customer, admin).
   * @param {string} language - Language code (e.g., 'en', 'fr').
   * @param {Object} params - Parameters to inject into the template.
   * @returns {string} Rendered template content.
   */
  async renderTemplate(templateName, role, language, params = {}) {
    try {
      if (!this.validRoles.includes(role)) {
        throw new AppError(`Invalid role: ${role}`, 400, 'INVALID_ROLE');
      }
      if (!templateName) {
        throw new AppError('Template name is required', 400, 'MISSING_TEMPLATE_NAME');
      }

      // Ensure language is supported
      const languageCode = localizationConstants.SUPPORTED_LANGUAGES.includes(language)
        ? language
        : localizationConstants.DEFAULT_LANGUAGE;

      // Construct template path
      const templatePath = path.join(this.basePath, role, `${templateName}_${languageCode}.html`);

      // Try to read the template file
      let templateContent;
      try {
        templateContent = await fs.readFile(templatePath, 'utf8');
      } catch (error) {
        logger.logWarnEvent(`Template not found, falling back to default language: ${templatePath}`, { role, templateName });
        // Fallback to default language template
        const fallbackPath = path.join(this.basePath, role, `${templateName}_${localizationConstants.DEFAULT_LANGUAGE}.html`);
        templateContent = await fs.readFile(fallbackPath, 'utf8').catch(() => {
          throw new AppError(`Template not found for ${role}: ${templateName}`, 404, 'TEMPLATE_NOT_FOUND');
        });
      }

      // Simple variable replacement (e.g., {{variable}})
      let renderedContent = templateContent;
      for (const [key, value] of Object.entries(params)) {
        renderedContent = renderedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // Fallback to localizationService if template content is empty
      if (!renderedContent.trim()) {
        logger.logWarnEvent(`Empty template content, using localizationService`, { templateName, role, language });
        renderedContent = formatMessage(role, 'notifications', languageCode, templateName, params);
      }

      logger.logInfoEvent('Template rendered successfully', { templateName, role, language });
      return renderedContent;
    } catch (error) {
      logger.logErrorEvent(`Failed to render template: ${error.message}`, { templateName, role, language });
      throw error instanceof AppError ? error : new AppError(error.message, 500, 'TEMPLATE_RENDER_ERROR');
    }
  }
}

module.exports = new TemplateService();