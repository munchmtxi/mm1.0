'use strict';

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/driver/mtxi/tipController');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const tipValidator = require('@validators/driver/mtxi/tipValidator');
const tipMiddleware = require('@middleware/driver/mtxi/tipMiddleware');

router.use(authenticate, restrictTo('driver'));
router.post('/confirm/:paymentId', tipValidator.validateTipConfirmation, tipMiddleware.validateTipConfirmation, tipController.confirmTip);

module.exports = router;