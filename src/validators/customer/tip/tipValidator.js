'use strict';

/**
 * Validator for customer tip endpoints
 */

const { body, param } = require('express-validator');
const tipConstants = require('@constants/common/tipConstants');
const munchConstants = require('@constants/common/munchConstants');

module.exports = {
  createTip: [
    body('customerId').isString().notEmpty(),
    body('recipientId').isString().notEmpty(),
    body('amount').isFloat({ min: tipConstants.TIP_SETTINGS.MIN_AMOUNT, max: tipConstants.TIP_SETTINGS.MAX_AMOUNT }),
    body('currency').isString().isIn(munchConstants.MUNCH_SETTINGS.SUPPORTED_CURRENCIES),
    body('rideId').optional().isString(),
    body('orderId').optional().isString(),
    body('bookingId').optional().isString(),
    body('eventServiceId').optional().isString(),
    body('inDiningOrderId').optional().isString(),
    body('parkingBookingId').optional().isString(),
    body().custom((value) => {
      const serviceIds = ['rideId', 'orderId', 'bookingId', 'eventServiceId', 'inDiningOrderId', 'parkingBookingId'];
      const provided = serviceIds.filter(id => value[id]);
      if (provided.length !== 1) throw new Error('Exactly one service ID must be provided');
      return true;
    }),
  ],

  updateTip: [
    param('tipId').isString().notEmpty(),
    body('customerId').isString().notEmpty(),
    body('amount').optional().isFloat({ min: tipConstants.TIP_SETTINGS.MIN_AMOUNT, max: tipConstants.TIP_SETTINGS.MAX_AMOUNT }),
    body('status').optional().isString().isIn(tipConstants.TIP_SETTINGS.TIP_STATUSES),
    body().custom((value) => {
      if (!value.amount && !value.status) throw new Error('At least one update field must be provided');
      return true;
    }),
  ],

  getCustomerTips: [
    param('customerId').isString().notEmpty(),
  ],
};