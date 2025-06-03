'use strict';

/**
 * Staff Profile Routes
 * Defines Express routes for admin staff profile operations, integrating authentication,
 * validation, and middleware.
 */

const express = require('express');
const { authenticate } = require('@middleware/common/authMiddleware');
const {
  checkStaffPermission,
  restrictToAdminRoles,
  verifyStaffStatus,
} = require('@middleware/admin/profile/staffProfileMiddleware');
const {
  validateCreateStaff,
  validateUpdateStaffDetails,
  validateCountry,
  validateWalletSettings,
} = require('@validators/admin/profile/staffProfileValidator');
const {
  createStaff,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
  setCountrySettings,
  manageWalletSettings,
} = require('@controllers/admin/profile/staffProfileController');

const router = express.Router();

router.use(authenticate, restrictToAdminRoles, checkStaffPermission);

router.post(
  '/',
  validateCreateStaff,
  verifyStaffStatus,
  createStaff
);

router.patch(
  '/:staffId',
  validateUpdateStaffDetails,
  verifyStaffStatus,
  updateStaffDetails
);

router.post(
  '/:staffId/compliance',
  verifyStaffStatus,
  verifyCompliance
);

router.get(
  '/:staffId',
  verifyStaffStatus,
  getStaffProfile
);

router.patch(
  '/:staffId/country',
  validateCountry,
  verifyStaffStatus,
  setCountrySettings
);

router.patch(
  '/:staffId/wallet/:walletId',
  validateWalletSettings,
  verifyStaffStatus,
  manageWalletSettings
);

module.exports = router;