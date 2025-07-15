'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const orderAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const processOrderAuth = orderAuth(munchConstants.PERMISSIONS.PROCESS_ORDER);
const applyDietaryPreferencesAuth = orderAuth(munchConstants.PERMISSIONS.APPLY_DIETARY_PREFERENCES);
const updateOrderStatusAuth = orderAuth(munchConstants.PERMISSIONS.UPDATE_ORDER_STATUS);
const payOrderWithWalletAuth = orderAuth(munchConstants.PERMISSIONS.PAY_ORDER_WITH_WALLET);

module.exports = {
  processOrderAuth,
  applyDietaryPreferencesAuth,
  updateOrderStatusAuth,
  payOrderWithWalletAuth,
};