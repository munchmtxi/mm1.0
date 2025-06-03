'use strict';

/**
 * Driver Profile Routes
 * Defines Express routes for admin driver profile operations, integrating authentication,
 * validation, and middleware.
 */

const express = require('express');
const { authenticate } = require('@middleware/common/authMiddleware');
const {
  checkDriverPermission,
  restrictToAdminRoles,
  verifyDriverStatus,
} = require('@middleware/admin/profile/driverProfileMiddleware');
const {
  validateCreateDriver,
  validateUpdateProfile,
  validateCertification,
  validateCountry,
  validateWalletSettings,
} = require('@validators/admin/profile/driverProfileValidator');
const {
  createDriver,
  updateProfile,
  uploadCertification,
  verifyProfile,
  setCountry,
  manageWalletSettings,
} = require('@controllers/admin/profile/driverProfileController');

const router = express.Router();

router.use(authenticate, restrictToAdminRoles, checkDriverPermission);

router.post(
  '/',
  validateCreateDriver,
  verifyDriverStatus,
  createDriver
);

router.patch(
  '/:driverId',
  validateUpdateProfile,
  verifyDriverStatus,
  updateProfile
);

router.post(
  '/:driverId/certifications',
  validateCertification,
  verifyDriverStatus,
  uploadCertification
);

router.post(
  '/:driverId/verify',
  verifyDriverStatus,
  verifyProfile
);

router.patch(
  '/:driverId/country',
  validateCountry,
  verifyDriverStatus,
  setCountry
);

router.patch(
  '/:driverId/wallet/:walletId',
  validateWalletSettings,
  verifyDriverStatus,
  manageWalletSettings
);

module.exports = router;