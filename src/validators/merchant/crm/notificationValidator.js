'use strict';

const { param, body } = require('express-validator');
const { formatMessage } = require('@utils/validator');
const merchantConstants = require('@constants/merchantConstants');

exports.validateSendCustomerAlert = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidCustomerId')),
  body('message.type')
    .isIn(merchantConstants.CRM_CONSTANTS.NOTIFICATION_CONSTANTS.VALID_CUSTOMER_TYPES)
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMessageType')),
  body('message.content')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
  body('message.orderId')
    .isString()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
  body('message.bookingId')
    .isString()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
];

exports.validateSendStaffNotification = [
  param('staffId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidStaffId')),
  body('message.type')
    .isIn(merchantConstants.CRM_CONSTANTS.NOTIFICATION_CONSTANTS.VALID_STAFF_TYPES)
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMessageType')),
  body('message.content')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
  body('message.taskId')
    .isString()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
];

exports.validateSendDriverNotification = [
  param('driverId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidDriverId')),
  body('message.type')
    .isIn(merchantConstants.CRM_CONSTANTS.NOTIFICATION_CONSTANTS.VALID_DRIVER_TYPES)
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidMessageType')),
  body('message.content')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
  body('message.orderId')
    .isString()
    .optional()
    .withMessage(formatMessage('merchant', 'crm', 'en', 'crm.errors.invalidNotificationData')),
];