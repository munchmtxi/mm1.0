'use strict';

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/customer/mtxi/tipController');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const tipValidator = require('@validators/customer/mtxi/tipValidator');

// Protect all routes and restrict to customer role
router.use(authenticate, restrictTo('customer'));

router.post('/:rideId', tipValidator.validateTipSubmission, tipController.submitTip);

module.exports = router;