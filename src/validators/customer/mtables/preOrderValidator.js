// src/validators/customer/mtables/preOrderValidator.js
'use strict';

const { body } = require('express-validator');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const socialConstants = require('@constants/common/socialConstants');

const createPreOrder = [
  body('bookingId').isInt().notEmpty().withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('items').isArray({ min: 1 }).withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('items.*.menuItemId').isInt().notEmpty().withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('items.*.quantity')
    .isInt({ min: mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM, max: mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM })
    .withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('items.*.customizations').optional().isArray().withMessage(mtablesConstants.ERROR_TYPES[25]),
  body('dietaryPreferences')
    .optional()
    .isArray()
    .custom(preferences => preferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref)))
    .withMessage(mtablesConstants.ERROR_TYPES[11]),
  body('paymentMethodId')
    .optional()
    .isString()
    .isIn(customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS)
    .withMessage(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]),
  body('recommendationData').optional().isObject().withMessage(mtablesConstants.ERROR_TYPES[0]),
];

const sendPreOrderRequestToFriends = [
  body('bookingId').isInt().notEmpty().withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('orderId').isInt().notEmpty().withMessage(mtablesConstants.ERROR_TYPES[0]),
  body('amount')
    .isFloat({ min: customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_DEPOSIT_AMOUNT })
    .withMessage(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]),
  body('billSplitType')
    .isString()
    .isIn(socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES)
    .withMessage(socialConstants.ERROR_CODES[17]),
];

module.exports = { createPreOrder, sendPreOrderRequestToFriends };