// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\subscription\subscriptionValidator.js
'use strict';

const { body, param } = require('express-validator');
const merchantConstants = require('@constants/merchantConstants');

const createSubscriptionPlanValidation = [
  param('merchantId').isInt().withMessage(merchantConstants.ERROR_CODES[1]), // MERCHANT_NOT_FOUND
  body('name').isString().notEmpty().withMessage(merchantConstants.ERROR_CODES[6]), // PAYMENT_FAILED
  body('price').isFloat({ gt: 0 }).withMessage(merchantConstants.ERROR_CODES[6]),
  body('currency').isIn(merchantConstants.MERCHANT_SETTINGS.SUPPORTED_CURRENCIES).withMessage(merchantConstants.ERROR_CODES[6]),
  body('benefits').isArray().notEmpty().withMessage(merchantConstants.ERROR_CODES[6]),
  body('durationDays').isInt({ gt: 0 }).withMessage(merchantConstants.ERROR_CODES[6]),
];

const trackSubscriptionTiersValidation = [
  param('customerId').isInt().withMessage(merchantConstants.ERROR_CODES[18]), // CUSTOMER_NOT_FOUND
];

const manageSubscriptionsValidation = [
  param('customerId').isInt().withMessage(merchantConstants.ERROR_CODES[18]),
  body('subscriptionId').isInt().withMessage(merchantConstants.ERROR_CODES[6]),
  body('operation').isIn(['enroll', 'upgrade', 'cancel']).withMessage(merchantConstants.ERROR_CODES[6]),
];

module.exports = {
  createSubscriptionPlanValidation,
  trackSubscriptionTiersValidation,
  manageSubscriptionsValidation,
};