'use strict';

/**
 * Merchant Profile Routes
 * Defines Express routes for admin merchant profile operations, integrating authentication,
 * validation, and middleware.
 */

const express = require('express');
const { authenticate } = require('@middleware/common/authMiddleware');
const {
  checkMerchantPermission,
  restrictToAdminRoles,
  verifyMerchantStatus,
} = require('@middleware/admin/profile/merchantProfileMiddleware');
const {
  validateCreateMerchant,
  validateUpdateBusinessDetails,
  validateCountry,
  validateBranchSettings,
  validateMedia,
  validateWalletSettings,
} = require('@validators/admin/profile/merchantProfileValidator');
const {
  createMerchant,
  updateBusinessDetails,
  setCountrySettings,
  manageBranchSettings,
  uploadMedia,
  manageWalletSettings,
} = require('@controllers/admin/profile/merchantProfileController');

const router = express.Router();

router.use(authenticate, restrictToAdminRoles, checkMerchantPermission);

router.post(
  '/',
  validateCreateMerchant,
  verifyMerchantStatus,
  createMerchant
);

router.patch(
  '/:merchantId',
  validateUpdateBusinessDetails,
  verifyMerchantStatus,
  updateBusinessDetails
);

router.patch(
  '/:merchantId/country',
  validateCountry,
  verifyMerchantStatus,
  setCountrySettings
);

router.patch(
  '/branches/:branchId',
  validateBranchSettings,
  verifyMerchantStatus,
  manageBranchSettings
);

router.post(
  '/:merchantId/media',
  validateMedia,
  verifyMerchantStatus,
  uploadMedia
);

router.patch(
  '/:merchantId/wallet/:walletId',
  validateWalletSettings,
  verifyMerchantStatus,
  manageWalletSettings
);

module.exports = router;