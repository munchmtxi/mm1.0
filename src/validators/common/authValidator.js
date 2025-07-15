'use strict';

const { body, query, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const authConstants = require('@constants/common/authConstants');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { errors: errors.array() });
    throw new AppError(
      errors.array().map((e) => e.msg).join('. '),
      400,
      authConstants.ERROR_CODES.VALIDATION_ERROR
    );
  }
  next();
};

const registerValidations = [
  body('first_name')
    .isString()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .isString()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .custom((value) => {
      const schema = new (require('password-validator'))();
      schema
        .is().min(8)
        .is().max(128)
        .has().uppercase(1)
        .has().lowercase(1)
        .has().digits(1)
        .has().symbols(1);
      if (!schema.validate(value)) {
        throw new Error('Password does not meet complexity requirements');
      }
      return true;
    }),
  body('phone')
    .optional()
    .isString()
    .custom((value) => {
      try {
        const number = phoneUtil.parse(value);
        return phoneUtil.isValidNumber(number);
      } catch {
        throw new Error('Invalid phone number format');
      }
    }),
  body('country')
    .isIn(['MWI', 'US'])
    .withMessage('Invalid country'),
  body('merchant_type')
    .optional()
    .isIn(['grocery', 'restaurant', 'cafe'])
    .withMessage('Merchant type must be grocery, restaurant, or cafe'),
  body('role')
    .optional()
    .isIn(authConstants.AUTH_SETTINGS.SUPPORTED_ROLES)
    .withMessage('Invalid role'),
  body('mfa_method')
    .optional()
    .isIn(authConstants.MFA_CONSTANTS.MFA_METHODS)
    .withMessage('Invalid MFA method'),
];

const registerNonCustomerValidations = [
  ...registerValidations.slice(0, -2),
  body('role')
    .isIn(authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.filter((r) => r !== authConstants.AUTH_SETTINGS.DEFAULT_ROLE))
    .withMessage('Role must be admin, driver, staff, or merchant'),
  body('mfa_method')
    .optional()
    .isIn(authConstants.MFA_CONSTANTS.MFA_METHODS)
    .withMessage('Invalid MFA method'),
];

const loginValidations = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  body('device_id')
    .optional()
    .isString()
    .withMessage('Device ID must be a string'),
  body('device_type')
    .if(body('device_id').exists())
    .isString()
    .notEmpty()
    .withMessage('Device type is required when device ID is provided')
    .isIn(['desktop', 'mobile', 'tablet', 'unknown'])
    .withMessage('Device type must be desktop, mobile, tablet, or unknown'),
  body('platform')
    .optional()
    .isString()
    .isIn(['web', 'ios', 'android'])
    .withMessage('Platform must be web, ios, or android'),
  body('role')
    .optional()
    .isIn(authConstants.AUTH_SETTINGS.SUPPORTED_ROLES)
    .withMessage('Invalid role'),
  body('mfa_code')
    .optional()
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage('MFA code must be 6 characters'),
];

const logoutValidations = [
  body('device_id')
    .optional()
    .isString()
    .withMessage('Device ID must be a string'),
  body('clear_all_devices')
    .optional()
    .isBoolean()
    .withMessage('Clear all devices must be a boolean'),
];

const refreshTokenValidations = [
  body('refresh_token')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const googleOAuthCallbackValidations = [
  query('code')
    .isString()
    .notEmpty()
    .withMessage('Authorization code is required'),
  query('state')
    .optional()
    .isString()
    .withMessage('State must be a string'),
];

const verifyMfaValidations = [
  body('user_id')
    .isInt()
    .withMessage('User ID must be an integer'),
  body('mfa_code')
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage('MFA code must be 6 characters'),
  body('mfa_method')
    .isIn(authConstants.MFA_CONSTANTS.MFA_METHODS)
    .withMessage('Invalid MFA method'),
];

module.exports = {
  validate,
  registerValidations,
  registerNonCustomerValidations,
  loginValidations,
  logoutValidations,
  refreshTokenValidations,
  googleOAuthCallbackValidations,
  verifyMfaValidations,
};