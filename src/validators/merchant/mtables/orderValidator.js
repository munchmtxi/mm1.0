'use strict';

const { param, body } = require('express-validator');
const mtablesConstants = require('@constants/merchant/mtablesConstants');
const { formatMessage } = require('@utils/localization');

const validateProcessExtraOrder = [
  param('bookingId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('items')
    .isArray({ min: 1 })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.menu_item_id')
    .isInt()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.quantity')
    .isInt({ min: mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM, max: mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.customizations')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.customizations.*.modifier_id')
    .optional()
    .isInt()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

const validateApplyDietaryFilters = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidCustomerId')),
  body('items')
    .isArray({ min: 1 })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.menu_item_id')
    .isInt()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
  body('items.*.quantity')
    .isInt({ min: mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM, max: mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM })
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

const validateUpdateOrderStatus = [
  param('orderId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('status')
    .isString()
    .isIn(mtablesConstants.ORDER_STATUSES)
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidBookingDetails')),
];

const validatePayOrderWithWallet = [
  param('orderId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidId')),
  body('walletId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mtables', 'en', 'mtables.errors.invalidPaymentDetails')),
];

module.exports = { validateProcessExtraOrder, validateApplyDietaryFilters, validateUpdateOrderStatus, validatePayOrderWithWallet };