'use strict';

const { body } = require('express-validator');
const socialConstants = require('@constants/common/socialConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');

module.exports = {
  invitePartyMember: [
    body('bookingId').isInt().withMessage('Booking ID must be an integer'),
    body('customerId').isInt().withMessage('Customer ID must be an integer'),
    body('inviteMethod')
      .isIn(socialConstants.SOCIAL_SETTINGS.INVITE_METHODS)
      .withMessage('Invalid invite method'),
  ],
  updatePartyMemberStatus: [
    body('bookingId').isInt().withMessage('Booking ID must be an integer'),
    body('status')
      .isIn(mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES)
      .withMessage('Invalid status'),
  ],
  removePartyMember: [
    body('bookingId').isInt().withMessage('Booking ID must be an integer'),
    body('customerId').isInt().withMessage('Customer ID must be an integer'),
  ],
  splitBill: [
    body('bookingId').isInt().withMessage('Booking ID must be an integer'),
    body('customerIds')
      .isArray({ min: 1 })
      .withMessage('Customer IDs must be a non-empty array'),
    body('customerIds.*').isInt().withMessage('Each customer ID must be an integer'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('currency')
      .isIn(['USD', 'EUR', 'GBP']) // Example currencies
      .withMessage('Invalid currency'),
    body('billSplitType')
      .isIn(socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES)
      .withMessage('Invalid bill split type'),
  ],
};