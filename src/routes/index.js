'use strict';

const express = require('express');
const router = express.Router();
const merchantProfileRoutes = require('@routes/merchant/profile/profileRoutes');
const customerProfileRoutes = require('@routes/customer/profile/profileRoutes');
const driverProfileRoutes = require('@routes/driver/profile/profileRoutes');
const staffProfileRoutes = require('@routes/staff/profile/staffProfileRoutes');
const adminProfileRoutes = require('@routes/admin/profile/adminProfileRoutes');

router.use('/merchant', merchantProfileRoutes);
router.use('/customer', customerProfileRoutes);
router.use('/driver', driverProfileRoutes);
router.use('/staff', staffProfileRoutes);
router.use('/admin', adminProfileRoutes);

module.exports = router;