// src/routes/staff/index.js
'use strict';
const express = require('express');
const router = express.Router();

const staffProfileRoutes = require('./profile/staffProfileRoutes');

router.use('/', staffProfileRoutes);

module.exports = router;