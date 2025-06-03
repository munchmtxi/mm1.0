'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  submitReview: [authenticate, restrictTo('customer'), checkPermissions('submitReview')],
  updateReview: [authenticate, restrictTo('customer'), checkPermissions('submitReview')],
  deleteReview: [authenticate, restrictTo('customer'), checkPermissions('submitReview')],
  manageInteraction: [authenticate, restrictTo('customer'), checkPermissions('interactReview')],
};