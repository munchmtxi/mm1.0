'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  updateCustomerProfile: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  setCustomerCountry: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  setCustomerLanguage: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  setCustomerDietaryPreferences: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
  getCustomerProfile: [authenticate, restrictTo('customer'), checkPermissions('manageProfile')],
};