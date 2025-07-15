'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const mTablesConstants = require('@constants/mTablesConstants');

const preOrderAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant', 'customer')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.PRE_ORDER_CREATE)(req, res, next);
    });
  });
};

const groupPaymentAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.GROUP_PAYMENT_PROCESS)(req, res, next);
    });
  });
};

const feedbackAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo('merchant')(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.FEEDBACK_SUBMIT)(req, res, next);
    });
  });
};

module.exports = { preOrderAuth, groupPaymentAuth, feedbackAuth };