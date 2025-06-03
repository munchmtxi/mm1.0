'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  enrollSubscription: [authenticate, restrictTo('customer'), checkPermissions('enroll_subscription')],
  manageSubscription: [authenticate, restrictTo('customer'), checkPermissions('manage_subscription')],
  trackSubscriptionTiers: [authenticate, restrictTo('customer'), checkPermissions('track_subscription')],
};