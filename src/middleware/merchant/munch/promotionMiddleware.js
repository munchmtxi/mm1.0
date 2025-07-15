'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const munchConstants = require('@constants/common/munchConstants');

const promotionAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const createPromotionAuth = promotionAuth(munchConstants.PERMISSIONS.CREATE_PROMOTION);
const manageLoyaltyProgramAuth = promotionAuth(munchConstants.PERMISSIONS.MANAGE_LOYALTY_PROGRAM);
const redeemPointsAuth = promotionAuth(munchConstants.PERMISSIONS.REDEEM_POINTS);

module.exports = {
  createPromotionAuth,
  manageLoyaltyProgramAuth,
  redeemPointsAuth,
};