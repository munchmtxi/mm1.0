'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const mTablesConstants = require('@constants/mTablesConstants');

const paymentAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant', 'customer')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.PAYMENT_PROCESS)(req, res, next);
    });
  });
};

const splitPaymentAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.SPLIT_PAYMENT_PROCESS)(req, res, next);
    });
  });
};

const refundAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.REFUND_PROCESS)(req, res, next);
    });
  });
};

module.exports = { paymentAuth, splitPaymentAuth, refundAuth };