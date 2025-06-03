'use strict';

/**
 * Customer Profile Routes
 * Defines Express routes for admin customer profile operations, integrating authentication,
 * validation, and middleware.
 */

const express = require('express');
const { authenticate } = require('@middleware/common/authMiddleware');
const {
  checkCustomerPermission,
  restrictToAdminRoles,
  verifyCustomerStatus,
} = require('@middleware/admin/profile/customerProfileMiddleware');
const {
  validateCreateCustomer,
  validateUpdateProfile,
  validateCountry,
  validateLanguage,
  validateDietaryPreferences,
  validateWalletSettings,
} = require('@validators/admin/profile/customerProfileValidator');
const {
  createCustomer,
  updateProfile,
  setCountry,
  setLanguage,
  setDietaryPreferences,
  awardProfilePoints,
  manageWalletSettings,
} = require('@controllers/admin/profile/customerProfileController');

const router = express.Router();

router.use(authenticate, restrictToAdminRoles, checkCustomerPermission);

router.post(
  '/',
  validateCreateCustomer,
  verifyCustomerStatus,
  createCustomer
);

router.patch(
  '/:userId',
  validateUpdateProfile,
  verifyCustomerStatus,
  updateProfile
);

router.patch(
  '/:userId/country',
  validateCountry,
  verifyCustomerStatus,
  setCountry
);

router.patch(
  '/:userId/language',
  validateLanguage,
  verifyCustomerStatus,
  setLanguage
);

router.patch(
  '/:userId/dietary',
  validateDietaryPreferences,
  verifyCustomerStatus,
  setDietaryPreferences
);

router.post(
  '/:userId/points',
  verifyCustomerStatus,
  awardProfilePoints
);

router.patch(
  '/:userId/wallet/:walletId',
  validateWalletSettings,
  verifyCustomerStatus,
  manageWalletSettings
);

module.exports = router;