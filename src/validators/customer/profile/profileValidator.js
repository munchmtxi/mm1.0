'use strict';

const { body, validationResult } = require('express-validator');
const { PROFILE } = require('@constants/customer/profileConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { requestId: req.id, errors: errors.array() });
    throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors.array());
  }
  next();
};

const updateProfile = [
  body('first_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('socialSettings.profileVisibility')
    .optional()
    .isIn(Object.values(PROFILE.VISIBILITY))
    .withMessage(`Profile visibility must be one of: ${Object.values(PROFILE.VISIBILITY).join(', ')}`),
  body('socialSettings.friendRequests')
    .optional()
    .isIn(Object.values(PROFILE.FRIEND_REQUEST_STATUS))
    .withMessage(`Friend request status must be one of: ${Object.values(PROFILE.FRIEND_REQUEST_STATUS).join(', ')}`),
  body('socialSettings.shareActivity')
    .optional()
    .isBoolean()
    .withMessage('Share activity must be a boolean'),
  body('privacySettings.showOnlineStatus')
    .optional()
    .isBoolean()
    .withMessage('Show online status must be a boolean'),
  body('privacySettings.allowPublicPosts')
    .optional()
    .isBoolean()
    .withMessage('Allow public posts must be a boolean'),
  body('privacySettings.shareProfileDetails')
    .optional()
    .isIn(Object.values(PROFILE.VISIBILITY))
    .withMessage(`Share profile details must be one of: ${Object.values(PROFILE.VISIBILITY).join(', ')}`),
  body('privacySettings.allowFriendSuggestions')
    .optional()
    .isBoolean()
    .withMessage('Allow friend suggestions must be a boolean'),
  body('privacySettings.blockList')
    .optional()
    .isArray()
    .withMessage('Block list must be an array'),
  body('privacySettings.blockList.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Block list entries must be valid user IDs')
    .custom(async (userId) => {
      const user = await User.findByPk(userId);
      if (!user) throw new Error('Invalid user ID in block list');
      return true;
    }),
  validate,
];

const changePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 100 })
    .withMessage('New password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  validate,
];

const managePaymentMethods = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(Object.values(PROFILE.ACTIONS.PAYMENT))
    .withMessage(`Action must be one of: ${Object.values(PROFILE.ACTIONS.PAYMENT).join(', ')}`),
  body('paymentMethod')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .notEmpty()
    .withMessage('Payment method is required for add action')
    .isObject()
    .withMessage('Payment method must be an object'),
  body('paymentMethod.type')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .notEmpty()
    .withMessage('Payment method type is required')
    .isIn(['credit_card', 'debit_card', 'paypal'])
    .withMessage('Payment method type must be credit_card, debit_card, or paypal'),
  body('paymentMethod.details')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .notEmpty()
    .withMessage('Payment method details are required')
    .isObject()
    .withMessage('Payment method details must be an object'),
  body('paymentMethod.details.cardNumber')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .if(body('paymentMethod.type').isIn(['credit_card', 'debit_card']))
    .notEmpty()
    .withMessage('Card number is required')
    .matches(/^\d{16}$/)
    .withMessage('Card number must be 16 digits'),
  body('paymentMethod.details.expiry')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .if(body('paymentMethod.type').isIn(['credit_card', 'debit_card']))
    .notEmpty()
    .withMessage('Expiry date is required')
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage('Expiry date must be in MM/YY format'),
  body('paymentMethod.details.cvc')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .if(body('paymentMethod.type').isIn(['credit_card', 'debit_card']))
    .notEmpty()
    .withMessage('CVC is required')
    .matches(/^\d{3,4}$/)
    .withMessage('CVC must be 3 or 4 digits'),
  body('paymentMethod.details.email')
    .if(body('action').equals(PROFILE.ACTIONS.PAYMENT.ADD))
    .if(body('paymentMethod.type').equals('paypal'))
    .notEmpty()
    .withMessage('PayPal email is required')
    .isEmail()
    .withMessage('Invalid PayPal email'),
  body('paymentMethod.id')
    .if(body('action').isIn([PROFILE.ACTIONS.PAYMENT.REMOVE, PROFILE.ACTIONS.PAYMENT.SET_DEFAULT]))
    .notEmpty()
    .withMessage('Payment method ID is required for remove or setDefault actions'),
  validate,
];

const manageFriends = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(Object.values(PROFILE.ACTIONS.FRIEND))
    .withMessage(`Action must be one of: ${Object.values(PROFILE.ACTIONS.FRIEND).join(', ')}`),
  body('friendId')
    .notEmpty()
    .withMessage('Friend ID is required')
    .isInt({ min: 1 })
    .withMessage('Friend ID must be a valid user ID'),
  validate,
];

const manageAddresses = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(Object.values(PROFILE.ACTIONS.ADDRESS))
    .withMessage(`Action must be one of: ${Object.values(PROFILE.ACTIONS.ADDRESS).join(', ')}`),
  body('addressData')
    .if(body('action').equals(PROFILE.ACTIONS.ADDRESS.ADD))
    .notEmpty()
    .withMessage('Address data is required for add action')
    .isObject()
    .withMessage('Address data must be an object'),
  body('addressData.placeId')
    .if(body('action').equals(PROFILE.ACTIONS.ADDRESS.ADD))
    .optional()
    .isString()
    .withMessage('Place ID must be a string'),
  body('addressData.address')
    .if(body('action').equals(PROFILE.ACTIONS.ADDRESS.ADD))
    .optional()
    .isString()
    .withMessage('Address must be a string'),
  body('addressData.coordinates')
    .if(body('action').equals(PROFILE.ACTIONS.ADDRESS.ADD))
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('addressData.coordinates.latitude')
    .if(body('addressData.coordinates').exists())
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('addressData.coordinates.longitude')
    .if(body('addressData.coordinates').exists())
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('addressData.id')
    .if(body('action').isIn([PROFILE.ACTIONS.ADDRESS.REMOVE, PROFILE.ACTIONS.ADDRESS.SET_DEFAULT]))
    .notEmpty()
    .withMessage('Address ID is required for remove or setDefault actions')
    .isInt({ min: 1 })
    .withMessage('Address ID must be a valid ID'),
  validate,
];

module.exports = {
  updateProfile,
  changePassword,
  managePaymentMethods,
  manageFriends,
  manageAddresses,
};