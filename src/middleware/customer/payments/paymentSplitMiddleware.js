'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  createSplitPayment: [authenticate, restrictTo('customer'), checkPermissions('split_payment')],
  processSplitPaymentRefunds: [authenticate, restrictTo('customer'), checkPermissions('refund_payment')],
};
