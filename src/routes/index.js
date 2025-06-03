// src/routes/index.js (main)
'use strict';
const express = require('express');
const router = express.Router();

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

module.exports = router;
