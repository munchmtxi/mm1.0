'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('@controllers/common/paymentController');
const paymentMiddleware = require('@middleware/common/paymentMiddleware');
const authMiddleware = require('@middleware/common/authMiddleware');

router.use(authMiddleware.authenticate);

router.post(
  '/',
  paymentMiddleware.validatePaymentIntent,
  paymentController.createPaymentIntent
);

router.post(
  '/:paymentId/confirm',
  paymentMiddleware.validatePaymentConfirmation,
  paymentController.confirmPayment
);

module.exports = router;