'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');

// Import domain routers
const commonRoutes = require('./common');
const adminRoutes = require('./admin');
const customerRoutes = require('./customer');
const driverRoutes = require('./driver');
const merchantRoutes = require('./merchant');
const staffRoutes = require('./staff');

// Mount at base paths
router.use('/common', commonRoutes);
router.use('/admin-api', adminRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);
router.use('/merchants', merchantRoutes);
router.use('/staff', staffRoutes);

// Apply auth middleware to customer analytics routes
router.use(
  '/customers/analytics',
  authenticate,
  restrictTo('customer'),
  checkPermissions(['track_behavior', 'analyze_spending', 'get_recommendations', 'track_parking_behavior'])
);

module.exports = router;


What You Should Do (Best Practice for the Clan)
Keep rateLimiters.general on all routes (as you're already doing).

Apply additional specific rate limiters to specific domains and risky endpoints:

js
Copy
Edit
// Apply general limiter globally
router.use(rateLimiters.general);

// Auth routes - more strict
router.use('/common/auth', rateLimiters.auth);

// Sensitive actions
router.use('/common/security', rateLimiters.sensitive);

// Optional: apply to customer actions
router.use('/customers/orders', rateLimiters.auth);
router.use('/customers/profile', rateLimiters.sensitive);

// Admin control panel
router.use('/admin-api', rateLimiters.sensitive);