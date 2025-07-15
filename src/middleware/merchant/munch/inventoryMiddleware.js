'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const inventoryAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const trackStockLevelsAuth = inventoryAuth(munchConstants.PERMISSIONS.TRACK_STOCK_LEVELS);
const updateInventoryAuth = inventoryAuth(munchConstants.PERMISSIONS.UPDATE_INVENTORY);
const sendRestockingAlertsAuth = inventoryAuth(munchConstants.PERMISSIONS.SEND_RESTOCKING_ALERTS);

module.exports = {
  trackStockLevelsAuth,
  updateInventoryAuth,
  sendRestockingAlertsAuth,
};