'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const merchantConstants = require('@constants/merchant/merchantConstants');

const profileAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const updateBusinessDetailsAuth = profileAuth(merchantConstants.MERCHANT_PROFILE_CONSTANTS.PERMISSIONS.UPDATE_BUSINESS_DETAILS);
const setCountrySettingsAuth = profileAuth(merchantConstants.MERCHANT_PROFILE_CONSTANTS.PERMISSIONS.SET_COUNTRY_SETTINGS);
const manageLocalizationAuth = profileAuth(merchantConstants.MERCHANT_PROFILE_CONSTANTS.PERMISSIONS.MANAGE_LOCALIZATION);

module.exports = {
  updateBusinessDetailsAuth,
  setCountrySettingsAuth,
  manageLocalizationAuth,
};