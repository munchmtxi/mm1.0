'use strict';

const { body, param } = require('express-validator');
const rideConstants = require('@constants/common/rideConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { validate } = require('@utils/validation');

const validateBookRide = [
  body('pickupLocation').isObject().notEmpty(),
  body('dropoffLocation').isObject().notEmpty(),
  body('rideType').isIn(rideConstants.RIDE_TYPES),
  body('scheduledTime').optional().isISO8601(),
  body('friends').optional().isArray().custom(arr => arr.length <= rideConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_RIDE),
  body('billSplit').optional().isObject().custom(obj => {
    if (!rideConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES.includes(obj.type)) return false;
    if (obj.participants.length > rideConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS) return false;
    return true;
  }),
  body('paymentMethodId').optional().isInt(),
  validate,
];

const validateUpdateRide = [
  param('rideId').isInt(),
  body('pickupLocation').optional().isObject(),
  body('dropoffLocation').optional().isObject(),
  body('scheduledTime').optional().isISO8601(),
  body('friends').optional().isArray().custom(arr => arr.length <= rideConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_RIDE),
  body('billSplit').optional().isObject().custom(obj => {
    if (!rideConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES.includes(obj.type)) return false;
    if (obj.participants.length > rideConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS) return false;
    return true;
  }),
  validate,
];

const validateCancelRide = [
  param('rideId').isInt(),
  validate,
];

const validateCheckInRide = [
  param('rideId').isInt(),
  body('coordinates').isObject().notEmpty(),
  validate,
];

const validateFeedback = [
  param('rideId').isInt(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString(),
  validate,
];

const validateAddFriend = [
  param('rideId').isInt(),
  body('friendCustomerId').isInt(),
  validate,
];

const validateBillSplit = [
  param('rideId').isInt(),
  body('type').isIn(rideConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES),
  body('participants').isArray().custom(arr => arr.length <= rideConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS),
  validate,
];

module.exports = {
  validateBookRide,
  validateUpdateRide,
  validateCancelRide,
  validateCheckInRide,
  validateFeedback,
  validateAddFriend,
  validateBillSplit,
};