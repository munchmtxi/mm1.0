'use strict';

/**
 * Validator for Admin Profile Operations
 * Defines validation rules for incoming request data using express-validator.
 * Integrates with validation utility for reusable validation logic.
 */

const { body, param, validationResult } = require('express-validator');
const validation = require('@utils/validation');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/common/authConstants');

/**
 * Middleware to handle validation errors.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, adminCoreConstants.ERROR_CODES.VALIDATION_FAILED, errors.array()));
  }
  next();
};

/**
 * Validator for creating an admin account.
 */
const createAdminValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH })
    .withMessage(`Password must be at least ${adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH} characters`),
  body('roleId')
    .isInt()
    .withMessage('Valid role ID is required'),
  body('countryCode')
    .optional()
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES)
    .withMessage('Country code must be a supported currency code'),
  body('languageCode')
    .optional()
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES)
    .withMessage('Language code must be a supported language code'),
  handleValidationErrors,
];

/**
 * Validator for updating an admin profile.
 */
const updateAdminValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH })
    .withMessage(`Password must be at least ${adminSystemConstants.SECURITY_CONSTANTS.PASSWORD_POLICY.MIN_LENGTH} characters`),
  body('countryCode')
    .optional()
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES)
    .withMessage('Country code must be a supported currency code'),
  body('languageCode')
    .optional()
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES)
    .withMessage('Language code must be a supported language code'),
  body('notificationPreferences')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || !adminEngagementConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.every(method => method in value)) {
        throw new Error('Notification preferences must include all supported delivery methods');
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Validator for setting admin permissions.
 */
const setPermissionsValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('permissionIds')
    .isArray({ min: 1 })
    .withMessage('At least one permission ID is required')
    .custom((value) => value.every(id => Number.isInteger(id)))
    .withMessage('Permission IDs must be integers'),
  handleValidationErrors,
];

/**
 * Validator for verifying admin identity (MFA).
 */
const verifyIdentityValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('mfaToken')
    .isString()
    .notEmpty()
    .withMessage('MFA token is required'),
  handleValidationErrors,
];

/**
 * Validator for suspending an admin account.
 */
const suspendAdminValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('Suspension reason is required'),
  handleValidationErrors,
];

/**
 * Validator for deleting an admin account.
 */
const deleteAdminValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  handleValidationErrors,
];

/**
 * Validator for generating admin reports.
 */
const generateReportsValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('period.startDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid start date is required'),
  body('period.endDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid end date is required'),
  handleValidationErrors,
];

/**
 * Validator for awarding admin points.
 */
const awardPointsValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('action')
    .isIn(Object.values(adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS).map(a => a.action))
    .withMessage('Valid gamification action is required'),
  body('points')
    .isInt({ min: 0, max: adminEngagementConstants.GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY })
    .withMessage(`Points must be between 0 and ${adminEngagementConstants.GAMIFICATION_CONSTANTS.MAX_POINTS_PER_DAY}`),
  handleValidationErrors,
];

/**
 * Validator for configuring localization settings.
 */
const configureLocalizationValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('countryCode')
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES)
    .withMessage('Country code must be a supported currency code'),
  body('languageCode')
    .isIn(adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES)
    .withMessage('Language code must be a supported language code'),
  handleValidationErrors,
];

/**
 * Validator for managing accessibility settings.
 */
const manageAccessibilityValidator = [
  param('adminId')
    .isInt()
    .withMessage('Valid admin ID is required'),
  body('settings')
    .custom(async (value) => {
      await validation.validateAccessibilitySettings(value);
      return true;
    })
    .withMessage('Invalid accessibility settings'),
  handleValidationErrors,
];

module.exports = {
  createAdminValidator,
  updateAdminValidator,
  setPermissionsValidator,
  verifyIdentityValidator,
  suspendAdminValidator,
  deleteAdminValidator,
  generateReportsValidator,
  awardPointsValidator,
  configureLocalizationValidator,
  manageAccessibilityValidator,
};