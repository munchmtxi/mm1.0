'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  getMenuItems: [authenticate.optional, restrictTo('customer').optional, checkPermissions('browse_menu').optional],
  checkItemAvailability: [authenticate.optional, restrictTo('customer').optional, checkPermissions('check_availability').optional],
};