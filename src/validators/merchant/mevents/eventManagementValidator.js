'use strict';

const { param, body } = require('express-validator');
const meventsConstants = require('@constants/merchant/meventsConstants');
const { formatMessage } = require('@utils/localization');

const validateCreateEvent = [
  param('eventId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidEventId')),
  body('merchantId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidMerchant')),
  body('title')
    .isString()
    .notEmpty()
    .isLength({ max: meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH })
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidTitle')),
  body('description')
    .optional()
    .isString()
    .isLength({ max: meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH })
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidDescription')),
  body('occasion')
    .isString()
    .isIn(Object.values(meventsConstants.EVENT_OCCASIONS))
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidOccasion')),
  body('paymentType')
    .isString()
    .isIn(Object.values(meventsConstants.PAYMENT_TYPES))
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidPaymentType')),
  body('participantIds')
    .optional()
    .isArray()
    .custom((value) => value.length <= meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS)
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.maxParticipantsExceeded')),
];

const validateManageGroupBookings = [
  param('eventId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidEventId')),
  body('orders')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService')),
  body('mtablesBookings')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService')),
  body('rides')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService')),
  body('inDiningOrders')
    .optional()
    .isArray()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService')),
];

const validateFacilitateGroupChat = [
  param('eventId')
    .isString()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidEventId')),
  body('participants')
    .isArray()
    .notEmpty()
    .withMessage(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidParticipant')),
];

module.exports = { validateCreateEvent, validateManageGroupBookings, validateFacilitateGroupChat };