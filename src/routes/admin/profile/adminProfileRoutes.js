'use strict';

/**
 * Routes for Admin Profile Operations
 * Defines Express routes for admin profile management, applying authentication, RBAC, validators, and middleware.
 */

const express = require('express');
const router = express.Router();
const adminProfileController = require('@controllers/admin/profile/adminProfileController');
const adminProfileValidator = require('@validators/admin/profile/adminProfileValidator');
const adminProfileMiddleware = require('@middleware/admin/profile/adminProfileMiddleware');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');

// Routes requiring SUPER_ADMIN role
router.post(
  '/',
  authenticate,
  restrictTo(adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN),
  adminProfileValidator.createAdminValidator,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.createAdmin
);

router.put(
  '/:adminId/permissions',
  authenticate,
  restrictTo(adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN),
  adminProfileValidator.setPermissionsValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.setPermissions
);

router.put(
  '/:adminId/suspend',
  authenticate,
  restrictTo(adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN),
  adminProfileValidator.suspendAdminValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.suspendAdmin
);

router.delete(
  '/:adminId',
  authenticate,
  restrictTo(adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN),
  adminProfileValidator.deleteAdminValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.deleteAdmin
);

// Routes requiring specific permissions or self-access
router.put(
  '/:adminId',
  authenticate,
  adminProfileValidator.updateAdminValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.restrictToSelfOrSuperAdmin,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.updateAdmin
);

router.post(
  '/:adminId/verify',
  authenticate,
  adminProfileValidator.verifyIdentityValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.restrictToSelfOrSuperAdmin,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.verifyIdentity
);

router.post(
  '/:adminId/reports',
  authenticate,
  checkPermissions(adminCoreConstants.ADMIN_PERMISSIONS.VIEW_REPORTS),
  adminProfileValidator.generateReportsValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.generateReports
);

router.post(
  '/:adminId/points',
  authenticate,
  restrictTo(adminCoreConstants.ADMIN_ROLES.SUPER_ADMIN),
  adminProfileValidator.awardPointsValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.awardPoints
);

router.put(
  '/:adminId/localization',
  authenticate,
  adminProfileValidator.configureLocalizationValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.restrictToSelfOrSuperAdmin,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.configureLocalization
);

router.put(
  '/:adminId/accessibility',
  authenticate,
  adminProfileValidator.manageAccessibilityValidator,
  adminProfileMiddleware.checkAdminExists,
  adminProfileMiddleware.restrictToSelfOrSuperAdmin,
  adminProfileMiddleware.addIpAddress,
  adminProfileController.manageAccessibility
);

module.exports = router;