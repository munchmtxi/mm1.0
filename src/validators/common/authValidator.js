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
      'VALIDATION_ERROR'
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
    .isLength({ min: 8, max: 100 })
    .custom((value) => {
      const schema = new (require('password-validator'))();
      schema
        .is()
        .min(8)
        .is()
        .max(100)
        .has()
        .uppercase()
        .has()
        .lowercase()
        .has()
        .digits()
        .has()
        .symbols();
      if (!schema.validate(value)) {
        throw new Error(
          'Password must be 8-100 characters with uppercase, lowercase, digit, and symbol'
        );
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
    .isIn(authConstants.VALID_COUNTRIES)
    .withMessage('Country must be malawi, zambia, mozambique, or tanzania'),
  body('merchant_type')
    .optional()
    .isIn(authConstants.MERCHANT_TYPES)
    .withMessage('Merchant type must be grocery or restaurant'),
  body('role')
    .optional()
    .isIn(Object.values(authConstants.ROLES))
    .withMessage('Invalid role'),
];

const registerNonCustomerValidations = [
  ...registerValidations.slice(0, -1),
  body('role')
    .isIn(
      Object.values(authConstants.ROLES).filter(
        (r) => r !== authConstants.ROLES.CUSTOMER
      )
    )
    .withMessage('Role must be admin, driver, staff, or merchant'),
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
    .isIn(Object.values(authConstants.ROLES))
    .withMessage('Invalid role'),
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

module.exports = {
  validate,
  registerValidations,
  registerNonCustomerValidations,
  loginValidations,
  logoutValidations,
  refreshTokenValidations,
  googleOAuthCallbackValidations,
};