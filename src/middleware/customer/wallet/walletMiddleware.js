'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  createWallet: [authenticate, restrictTo('customer'), checkPermissions('create_wallet')],
  addFunds: [authenticate, restrictTo('customer'), checkPermissions('add_funds')],
  withdrawFunds: [authenticate, restrictTo('customer'), checkPermissions('withdraw_funds')],
  payWithWallet: [authenticate, restrictTo('customer'), checkPermissions('pay_with_wallet')],
  getWalletBalance: [authenticate, restrictTo('customer'), checkPermissions('view_wallet')],
  getWalletTransactions: [authenticate, restrictTo('customer'), checkPermissions('view_wallet')],
  creditWallet: [authenticate, restrictTo('customer'), checkPermissions('credit_wallet')],
};