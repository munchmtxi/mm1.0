'use strict';

const express = require('express');
const { submitVerification, approveVerification } = require('@controllers/common/verificationController');
const { validateSubmitVerification, validateApproveVerification } = require('@validations/common/verificationValidation');
const { checkVerificationEligibility, checkVerificationExists } = require('@middleware/common/verificationMiddleware');
const { authenticate, checkPermissions } = require('@middleware/authMiddleware');
const router = express.Router();

// Submit verification (authenticated users, eligible roles only)
router.post(
  '/submit',
  authenticate,
  validateSubmitVerification,
  checkVerificationEligibility,
  submitVerification
);

// Approve verification (admin-only)
router.post(
  '/approve',
  authenticate,
  checkPermissions(['admin']),
  validateApproveVerification,
  checkVerificationExists,
  approveVerification
);

module.exports = router;