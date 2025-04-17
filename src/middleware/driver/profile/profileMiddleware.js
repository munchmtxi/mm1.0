'use strict';

const { body, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { ACTIONS } = require('@constants/driver/profileConstants');

const validatePersonalInfo = [
  body('first_name').optional().isString().trim().isLength({ min: 2, max: 50 }),
  body('last_name').optional().isString().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for personal info', { errors: errors.array() });
      throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors.array());
    }
    next();
  },
];

const validateVehicleInfo = [
  body('type').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for vehicle info', { errors: errors.array() });
      throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors.array());
    }
    next();
  },
];

const validatePasswordChange = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 100 })
    .matches(/[A-Z]/, 'i')
    .matches(/[a-z]/, 'i')
    .matches(/[0-9]/)
    .matches(/[^A-Za-z0-9]/),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for password change', { errors: errors.array() });
      throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors.array());
    }
    next();
  },
];

const validateProfilePicture = (req, res, next) => {
  if (!req.file) {
    logger.warn('No profile picture uploaded');
    throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
  }
  next();
};

const validateLicensePicture = (req, res, next) => {
  if (!req.file) {
    logger.warn('No license picture uploaded');
    throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
  }
  next();
};

const validateAddressAction = [
  body('action')
    .isString()
    .isIn([ACTIONS.ADDRESS.ADD, ACTIONS.ADDRESS.REMOVE])
    .withMessage('Invalid action'),
  body('addressData').custom((value, { req }) => {
    if (req.body.action === ACTIONS.ADDRESS.ADD) {
      if (!value || !value.formattedAddress) {
        throw new Error('Formatted address is required for adding an address');
      }
    } else if (req.body.action === ACTIONS.ADDRESS.REMOVE) {
      if (!value || !value.id) {
        throw new Error('Address ID is required for removing an address');
      }
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for address action', { errors: errors.array() });
      throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors.array());
    }
    next();
  },
];

module.exports = {
  validatePersonalInfo,
  validateVehicleInfo,
  validatePasswordChange,
  validateProfilePicture,
  validateLicensePicture,
  validateAddressAction,
};