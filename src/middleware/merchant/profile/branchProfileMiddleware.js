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

const updateBranchDetailsAuth = profileAuth(merchantConstants.PROFILE_CONSTANTS.PERMISSIONS.UPDATE_BRANCH_DETAILS);
const configureBranchSettingsAuth = profileAuth(merchantConstants.PROFILE_CONSTANTS.PERMISSIONS.CONFIGURE_BRANCH_SETTINGS);
const manageBranchMediaAuth = profileAuth(merchantConstants.PROFILE_CONSTANTS.PERMISSIONS.UPLOAD_BRANCH_MEDIA);
const syncBranchProfilesAuth = profileAuth(merchantConstants.PROFILE_CONSTANTS.PERMISSIONS.SYNC_BRANCH_PROFILES);

module.exports = {
  updateBranchDetailsAuth,
  configureBranchSettingsAuth,
  manageBranchMediaAuth,
  syncBranchProfilesAuth,
};