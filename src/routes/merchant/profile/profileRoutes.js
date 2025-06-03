'use strict';

/**
 * Merchant Profile Routes
 * Defines Express routes for merchant profile operations, including business details,
 * country settings, localization, gamification, media, and branch management. Applies
 * authentication, validation, and role-based middleware.
 *
 * Last Updated: May 14, 2025
 */

const express = require('express');
const merchantProfileController = require('@controllers/merchant/profile/merchantProfileController');
const profileMiddleware = require('@middleware/merchant/profile/profileMiddleware');
const profileValidator = require('@validators/merchant/profile/profileValidator');

const router = express.Router();

/**
 * Route to update merchant business details.
 */
router.put(
  '/:merchantId/business',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMerchantId,
  profileMiddleware.restrictToOwnMerchant,
  profileValidator.validateUpdateBusinessDetails,
  merchantProfileController.updateBusinessDetails
);

/**
 * Route to set merchant country settings.
 */
router.put(
  '/:merchantId/country',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMerchantId,
  profileMiddleware.restrictToOwnMerchant,
  profileValidator.validateCountrySettings,
  merchantProfileController.setCountrySettings
);

/**
 * Route to manage merchant localization settings.
 */
router.put(
  '/:merchantId/localization',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMerchantId,
  profileMiddleware.restrictToOwnMerchant,
  profileValidator.validateLocalizationSettings,
  merchantProfileController.manageLocalization
);

/**
 * Route to track merchant profile gamification points.
 */
router.post(
  '/:merchantId/gamification',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMerchantId,
  profileMiddleware.restrictToOwnMerchant,
  merchantProfileController.trackProfileGamification
);

/**
 * Route to upload menu photos for a restaurant.
 */
router.post(
  '/:restaurantId/menu-photos',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateBranchId,
  profileValidator.validateMenuPhotos,
  merchantProfileController.uploadMenuPhotos
);

/**
 * Route to manage promotional media for a restaurant.
 */
router.post(
  '/:restaurantId/promotional-media',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateBranchId,
  profileValidator.validatePromotionalMedia,
  merchantProfileController.managePromotionalMedia
);

/**
 * Route to update media metadata.
 */
router.put(
  '/media/:mediaId/metadata',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMediaId,
  profileValidator.validateMediaMetadata,
  merchantProfileController.updateMediaMetadata
);

/**
 * Route to delete media.
 */
router.delete(
  '/media/:mediaId',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMediaId,
  merchantProfileController.deleteMedia
);

/**
 * Route to update branch details.
 */
router.put(
  '/branch/:branchId/details',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateBranchId,
  profileValidator.validateBranchDetails,
  merchantProfileController.updateBranchDetails
);

/**
 * Route to configure branch settings.
 */
router.put(
  '/branch/:branchId/settings',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateBranchId,
  profileValidator.validateBranchSettings,
  merchantProfileController.configureBranchSettings
);

/**
 * Route to manage branch media.
 */
router.post(
  '/branch/:branchId/media',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateBranchId,
  profileValidator.validateBranchMedia,
  merchantProfileController.manageBranchMedia
);

/**
 * Route to synchronize branch profiles.
 */
router.post(
  '/:merchantId/branches/sync',
  profileMiddleware.authenticateMerchant,
  profileMiddleware.restrictToMerchantTypes,
  profileMiddleware.validateMerchantId,
  profileMiddleware.restrictToOwnMerchant,
  merchantProfileController.syncBranchProfiles
);

module.exports = router;