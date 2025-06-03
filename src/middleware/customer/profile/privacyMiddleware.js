'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  updatePrivacySettings: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  updateDataAccess: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
};