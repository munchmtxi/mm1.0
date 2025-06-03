'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  updateScreenReader: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  updateFontSize: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  updateLanguage: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
};