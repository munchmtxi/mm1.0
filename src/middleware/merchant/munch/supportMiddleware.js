'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const supportAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const handleOrderInquiryAuth = supportAuth(munchConstants.PERMISSIONS.HANDLE_ORDER_INQUIRY);
const resolveOrderDisputeAuth = supportAuth(munchConstants.PERMISSIONS.RESOLVE_ORDER_DISPUTE);
const shareOrderPoliciesAuth = supportAuth(munchConstants.PERMISSIONS.SHARE_ORDER_POLICIES);

module.exports = {
  handleOrderInquiryAuth,
  resolveOrderDisputeAuth,
  shareOrderPoliciesAuth,
};