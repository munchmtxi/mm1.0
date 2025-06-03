'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  redeemPromotion: [authenticate, restrictTo('customer'), checkPermissions('redeem_promotion')],
  getAvailablePromotions: [authenticate, restrictTo('customer'), checkPermissions('view_promotions')],
};