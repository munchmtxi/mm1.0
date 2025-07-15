'use strict';

const { param, body } = require('express-validator');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const { formatMessage } = require('@utils/localization');

const validateProcessCheckIn = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('method')
    .isString()
    .isIn(Object.values(mtablesConstants.CHECK_IN_METHODS))
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('qrCode')
    .if(body('method').equals(mtablesConstants.CHECK_IN_METHODS.QR_CODE))
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

const validateUpdateTableStatus = [
  param('tableId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('status')
    .isString()
    .isIn(mtablesConstants.TABLE_STATUSES)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

const validateLogCheckInTime = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
];

const validateHandleSupportRequest = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('bookingType')
    .isString()
    .isIn(mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('description')
    .isString()
    .notEmpty()
    .isLength({ max: mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

module.exports = { validateProcessCheckIn, validateUpdateTableStatus, validateLogCheckInTime, validateHandleSupportRequest };