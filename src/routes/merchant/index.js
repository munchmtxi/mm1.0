// src/routes/merchant/index.js
'use strict';
const express = require('express');
const router = express.Router();

const merchantProfileRoutes = require('./profile/profileRoutes');

router.use('/', merchantProfileRoutes);

module.exports = router;