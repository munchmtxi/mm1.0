'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/localization');

const validateSendDriverMessage = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'drivers', 'en', 'driverCommunication.errors.invalidDriverId')),
  body('message')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'drivers', 'en', 'driverCommunication.errors.invalidMessage')),
];

const validateBroadcastDeliveryUpdates = [
  param('orderId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'drivers', 'en', 'driverCommunication.errors.invalidOrderId')),
  body('message')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'drivers', 'en', 'driverCommunication.errors.invalidMessage')),
];

const validateManageDriverChannels = [
  param('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'drivers', 'en', 'driverCommunication.errors.invalidMerchantId')),
];

module.exports = { validateSendDriverMessage, validateBroadcastDeliveryUpdates, validateManageDriverChannels };