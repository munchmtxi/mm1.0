'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const deliveryAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const assignDeliveryAuth = deliveryAuth(munchConstants.PERMISSIONS.ASSIGN_DELIVERY);
const trackDeliveryStatusAuth = deliveryAuth(munchConstants.PERMISSIONS.TRACK_DELIVERY_STATUS);
const communicateWithDriverAuth = deliveryAuth(munchConstants.PERMISSIONS.COMMUNICATE_WITH_DRIVER);

module.exports = {
  assignDeliveryAuth,
  trackDeliveryStatusAuth,
  communicateWithDriverAuth,
};