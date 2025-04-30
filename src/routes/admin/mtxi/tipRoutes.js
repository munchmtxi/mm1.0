'use strict';

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/admin/mtxi/tipController');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const { restrictTipAdmin } = require('@middleware/admin/mtxi/tipMiddleware');
const { validateTipId, validateTipDispute } = require('@validators/admin/mtxi/tipValidator');

router.use(authenticate, restrictTo('admin'), restrictTipAdmin);
router.get('/:paymentId', validateTipId, tipController.getTipDetails);
router.post('/:paymentId/dispute', validateTipDispute, tipController.handleTipDispute);

module.exports = router;