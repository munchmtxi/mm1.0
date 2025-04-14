'use strict';

const express = require('express');
const router = express.Router();
const merchantProfileRoutes = require('@routes/merchant/profile/profileRoutes');

router.use('/merchant', merchantProfileRoutes);

module.exports = router;