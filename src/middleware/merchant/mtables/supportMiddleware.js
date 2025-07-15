'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const mTablesConstants = require('@constants/common/mTablesConstants');

const inquiryAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant', 'customer'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.SUPPORT_TICKET_CREATE)(req, res, next);
    });
  });
};

const disputeAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.SUPPORT_TICKET_RESOLVE)(req, res, next);
    });
  });
};

const policyAuth = (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant', 'customer'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(mTablesConstants.PERMISSIONS.POLICY_COMMUNICATE)(req, res, next);
    });
  });
};

module.exports = { inquiryAuth, disputeAuth, policyAuth };