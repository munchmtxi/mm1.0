// src/routes/common/index.js
'use strict';
const express = require('express');
const router = express.Router();

// Core authentication and verification
const authRoutes = require('./authRoutes');
const verificationRoutes = require('./verificationRoutes');

router.use('/auth', authRoutes);
router.use('/verify', verificationRoutes);

module.exports = router;
