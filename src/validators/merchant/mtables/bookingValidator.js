'use strict';

const { param, body } = require('express-validator');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const { formatMessage } = require('@utils/localization');

const validateCreateReservation = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidCustomerId')),
  body('branchId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('tableId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('guestCount')
    .isInt({ min: mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY, max: mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidPartySize')),
  body('date')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDate')),
  body('time')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidTime')),
  body('seatingPreference')
    .optional()
    .isIn(mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidSeatingPreference')),
  body('dietaryFilters')
    .optional()
    .isArray()
    .custom((value) => value.every(v => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(v)))
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDietaryFilters')),
  body('depositAmount')
    .optional()
    .isFloat({ min: mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT, max: mtablesConstants.FINANCIAL_SETTINGS.MAX_DEPOSIT_AMOUNT })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDepositAmount')),
];

const validateManageWaitlist = [
  param('branchId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBranchId')),
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidCustomerId')),
];

const validateSetBookingPolicies = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidMerchantId')),
  body('cancellationWindowHours')
    .isInt({ min: 0 })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidCancellationWindow')),
  body('depositPercentage')
    .isFloat({ min: mtablesConstants.BOOKING_POLICIES.MIN_DEPOSIT_PERCENTAGE })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDepositPercentage')),
];

const validateUpdateReservation = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('guestCount')
    .optional()
    .isInt({ min: mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY, max: mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidPartySize')),
  body('date')
    .optional()
    .isString()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDate')),
  body('time')
    .optional()
    .isString()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidTime')),
  body('seatingPreference')
    .optional()
    .isIn(mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidSeatingPreference')),
  body('dietaryFilters')
    .optional()
    .isArray()
    .custom((value) => value.every(v => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(v)))
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidDietaryFilters')),
];

module.exports = { validateCreateReservation, validateManageWaitlist, validateSetBookingPolicies, validateUpdateReservation };