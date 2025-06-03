'use strict';

/**
 * Branch Profile Routes
 * Defines Express routes for admin branch profile operations, integrating authentication,
 * validation, and middleware.
 */

const express = require('express');
const { authenticate } = require('@middleware/common/authMiddleware');
const {
  checkBranchPermission,
  restrictToAdminRoles,
  verifyMerchantStatus,
} = require('@middleware/admin/profile/branchProfileMiddleware');
const {
  validateCreateBranch,
  validateUpdateBranchDetails,
  validateGeofence,
  validateOperatingHours,
  validateMedia,
} = require('@validators/admin/profile/branchProfileValidator');
const {
  createBranch,
  updateBranchDetails,
  setGeofence,
  setOperatingHours,
  uploadMedia,
} = require('@controllers/admin/profile/branchProfileController');

const router = express.Router();

router.use(authenticate, restrictToAdminRoles, checkBranchPermission);

router.post(
  '/',
  validateCreateBranch,
  verifyMerchantStatus,
  createBranch
);

router.patch(
  '/:branchId',
  validateUpdateBranchDetails,
  updateBranchDetails
);

router.patch(
  '/:branchId/geofence',
  validateGeofence,
  setGeofence
);

router.patch(
  '/:branchId/operating-hours',
  validateOperatingHours,
  setOperatingHours
);

router.post(
  '/:branchId/media',
  validateMedia,
  uploadMedia
);

module.exports = router;