'use strict';

const express = require('express');
const router = express.Router();

// Profile routes
const merchantProfileRoutes = require('@routes/merchant/profile/profileRoutes');
const customerProfileRoutes = require('@routes/customer/profile/profileRoutes');
const driverProfileRoutes = require('@routes/driver/profile/profileRoutes');
const staffProfileRoutes = require('@routes/staff/profile/staffProfileRoutes');
const adminProfileRoutes = require('@routes/admin/profile/adminProfileRoutes');

// Admin mtxi routes
const adminRideRoutes = require('@routes/admin/mtxi/rideRoutes');
const adminSubscriptionRoutes = require('@routes/admin/mtxi/subscriptionRoutes');
const adminTipRoutes = require('@routes/admin/mtxi/tipRoutes');

// Customer mtxi routes
const customerRideRoutes = require('@routes/customer/mtxi/rideRoutes');
const customerSubscriptionRoutes = require('@routes/customer/mtxi/subscriptionRoutes');
const customerTipRoutes = require('@routes/customer/mtxi/tipRoutes');

// Driver mtxi routes
const driverRideRoutes = require('@routes/driver/mtxi/rideRoutes');
const driverTipRoutes = require('@routes/driver/mtxi/tipRoutes');

// Common routes
const paymentRoutes = require('@routes/common/paymentRoutes');

// Mount profile routes
router.use('/merchant', merchantProfileRoutes);
router.use('/customer', customerProfileRoutes);
router.use('/driver', driverProfileRoutes);
router.use('/staff', staffProfileRoutes);
router.use('/admin', adminProfileRoutes);

// Mount admin mtxi routes
router.use('/admin/mtxi/rides', adminRideRoutes);
router.use('/admin/mtxi/subscriptions', adminSubscriptionRoutes);
router.use('/admin/mtxi/tips', adminTipRoutes);

// Mount customer mtxi routes
router.use('/customer/mtxi/rides', customerRideRoutes);
router.use('/customer/mtxi/subscriptions', customerSubscriptionRoutes);
router.use('/customer/mtxi/tips', customerTipRoutes);

// Mount driver mtxi routes
router.use('/driver/mtxi/rides', driverRideRoutes);
router.use('/driver/mtxi/tips', driverTipRoutes);

// Mount common routes
router.use('/payments', paymentRoutes);

module.exports = router;