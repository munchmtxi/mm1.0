'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  createTip: [authenticate, restrictTo('customer'), checkPermissions('create_tip')],
  updateTip: [authenticate, restrictTo('customer'), checkPermissions('update_tip')],
  getCustomerTips: [authenticate, restrictTo('customer'), checkPermissions('view_tips')],
};