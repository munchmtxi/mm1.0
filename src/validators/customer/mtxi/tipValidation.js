'use strict';

const { body } = require('express-validator');
const tipConstants = require('../constants/customer/tipConstants');
const paymentConstants = require('../constants/paymentConstants.js');
const { validate } = require('../utils/validation');

const TIP_LIMITS = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'TIP');

const validateSendTip = [
  body('rideId').optional().isInt(),
  body('orderId').optional().isInt(),
  body('amount').isFloat({ min: TIP_LIMITS.min, max: TIP_LIMITS.max }),
  body('walletId').isInt(),
  body('splitWithFriends').optional().isArray(),
  body('splitWithFriends.*').optional().isInt(),
  body().custom((value) => {
    if ((value.rideId && value.orderId) || (!value.rideId && !value.orderId)) {
      throw new Error('Must provide either rideId or orderId');
    }
    return true;
  }),
  validate,
];

const validateCancelTip = [
  body('tipId').isInt(),
  validate,
];

const validateUpdateTipStatus = [
  body('tipId').isInt(),
  body('newStatus').isIn(tipConstants.TIP_SETTINGS.TIP_STATUSES),
  validate,
];

module.exports = {
  validateSendTip,
  validateCancelTip,
  validateUpdateTipStatus,
};