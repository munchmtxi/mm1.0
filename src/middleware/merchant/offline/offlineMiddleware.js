'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const merchantConstants = require('@constants/merchant/merchantConstants');

const offlineAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const cacheOrdersAuth = offlineAuth(merchantConstants.PERMISSION_LEVELS.CACHE_ORDERS);
const cacheBookingsAuth = offlineAuth(merchantConstants.PERMISSION_LEVELS.CACHE_BOOKINGS);
const syncOfflineDataAuth = offlineAuth(merchantConstants.PERMISSION_LEVELS.SYNC_OFFLINE_DATA);

module.exports = {
  cacheOrdersAuth,
  cacheBookingsAuth,
  syncOfflineDataAuth,
};