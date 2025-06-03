// src/routes/admin/index.js
'use strict';
const express = require('express');
const router = express.Router();

// Import sub-category routes
const adminProfileRoutes = require('./profile/adminProfileRoutes');
const customerProfileRoutes = require('./profile/customerProfileRoutes');
const driverProfileRoutes = require('./profile/driverProfileRoutes');
const merchantProfileRoutes = require('./profile/merchantProfileRoutes');
const branchProfileRoutes = require('./profile/branchProfileRoutes');
const staffProfileRoutes = require('./profile/staffProfileRoutes');

// Mount routes
router.use('/admin', adminProfileRoutes);
router.use('/customers', customerProfileRoutes);
router.use('/drivers', driverProfileRoutes);
router.use('/merchants', merchantProfileRoutes);
router.use('/branches', branchProfileRoutes);
router.use('/staff', staffProfileRoutes);

module.exports = router;