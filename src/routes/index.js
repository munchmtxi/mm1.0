'use strict';

const express = require('express');
const router = express.Router();
const merchantProfileRoutes = require('@routes/merchant/profile/profileRoutes');
const customerProfileRoutes = require('@routes/customer/profile/profileRoutes');
const driverProfileRoutes = require('@routes/driver/profile/profileRoutes');
const staffProfileRoutes = require('@routes/staff/profile/staffProfileRoutes');

router.use('/merchant', merchantProfileRoutes);
router.use('/customer', customerProfileRoutes);
router.use('/driver', driverProfileRoutes);
router.use('/staff', staffProfileRoutes);

module.exports = router;