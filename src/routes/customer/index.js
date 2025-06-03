'use strict';

/**
 * Customer Routes Index
 * Central entry point for customer-related API routes.
 * Last Updated: May 28, 2025
 */

const express = require('express');
const router = express.Router();

const customerProfileRoutes = require('./profile/profileRoutes');
const customerAnalyticsRoutes = require('./analytics/analyticsRoutes');

// Mount profile routes
router.use('/', customerProfileRoutes);

// Mount analytics routes
router.use('/analytics', customerAnalyticsRoutes);

module.exports = router;