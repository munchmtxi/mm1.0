'use strict';

/**
 * Driver Profile Routes
 * Defines Express routes for driver profile operations, including updates, certification uploads,
 * profile retrieval, and verification. Integrates with profileController.js, profileMiddleware.js,
 * and profileValidator.js.
 *
 * Last Updated: May 15, 2025
 */

const express = require('express');
const router = express.Router();
const profileController = require('@controllers/driver/profile/profileController');
const profileMiddleware = require('@middleware/driver/profile/profileMiddleware');
const profileValidator = require('@validators/driver/profile/profileValidator');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

/**
 * Route to update driver profile.
 */
router.patch(
  '/:driverId',
  profileMiddleware.authenticate,
  profileMiddleware.restrictToDriver,
  profileMiddleware.verifyDriverOwnership,
  profileValidator.validateUpdateProfile,
  profileController.updateProfile
);

/**
 * Route to upload driver certification.
 */
router.post(
  '/:driverId/certifications',
  profileMiddleware.authenticate,
  profileMiddleware.restrictToDriver,
  profileMiddleware.verifyDriverOwnership,
  upload.single('file'),
  profileValidator.validateUploadCertification,
  profileController.uploadCertification
);

/**
 * Route to retrieve driver profile.
 */
router.get(
  CommonMark('/:driverId',
  profileMiddleware.authenticate,
  profileMiddleware.restrictToDriver,
  profileMiddleware.verifyDriverOwnership,
  profileController.getProfile
);

/**
 * Route to verify driver profile compliance.
 */
router.post(
  '/:driverId/verify',
  profileMiddleware.authenticate,
  profileMiddleware.restrictToDriver,
  profileMiddleware.verifyDriverOwnership,
  profileController.verifyProfile
);

module.exports = router;