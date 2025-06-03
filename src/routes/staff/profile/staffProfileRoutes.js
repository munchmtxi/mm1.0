'use strict';

/**
 * Staff Profile Routes
 * Defines Express routes for staff profile operations, including updating details,
 * verifying compliance, and retrieving profiles. Applies authentication, validation,
 * and role-based middleware.
 *
 * Last Updated: May 14, 2025
 */

const express = require('express');
const staffProfileController = require('@controllers/staff/profile/staffProfileController');
const staffProfileMiddleware = require('@middleware/staff/profile/staffProfileMiddleware');
const staffProfileValidator = require('@validators/staff/profile/staffProfileValidator');

const router = express.Router();

/**
 * Route to update staff profile details.
 */
router.put(
  '/:staffId',
  staffProfileMiddleware.authenticateStaff,
  staffProfileMiddleware.restrictToStaffOrManager,
  staffProfileMiddleware.validateStaffId,
  staffProfileMiddleware.restrictToOwnProfileOrManager,
  staffProfileValidator.validateUpdateStaffDetails,
  staffProfileController.updateStaffDetails
);

/**
 * Route to verify staff compliance.
 */
router.post(
  '/:staffId/compliance',
  staffProfileMiddleware.authenticateStaff,
  staffProfileMiddleware.restrictToStaffOrManager,
  staffProfileMiddleware.checkProfileUpdatePermission,
  staffProfileMiddleware.validateStaffId,
  staffProfileController.verifyCompliance
);

/**
 * Route to retrieve staff profile.
 */
router.get(
  '/:staffId',
  staffProfileMiddleware.authenticateStaff,
  staffProfileMiddleware.restrictToStaffOrManager,
  staffProfileMiddleware.validateStaffId,
  staffProfileMiddleware.restrictToOwnProfileOrManager,
  staffProfileController.getStaffProfile
);

module.exports = router;