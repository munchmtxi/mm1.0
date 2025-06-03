// src/routes/driver/index.js
'use strict';
const express = require('express');
const router = express.Router();

const driverProfileRoutes = require('./profile/profileRoutes');
const driverIndex = require('./index'); // if additional driver routes exist

router.use('/', driverProfileRoutes);

module.exports = router;