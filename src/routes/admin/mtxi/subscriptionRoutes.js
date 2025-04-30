'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/admin/mtxi/subscriptionController');
const subscriptionMiddleware = require('@middleware/admin/mtxi/subscriptionMiddleware');
const authMiddleware = require('@middleware/common/authMiddleware');

// Protect all routes and restrict to admin role
router.use(authMiddleware.authenticate, authMiddleware.restrictTo('admin'));

router.get('/:subscriptionId', subscriptionMiddleware.validateSubscriptionAccess, subscriptionController.getSubscriptionDetails);
router.patch('/:subscriptionId/status', subscriptionMiddleware.validateSubscriptionAccess, subscriptionController.updateSubscriptionStatus);
router.post('/:subscriptionId/dispute', subscriptionMiddleware.validateSubscriptionAccess, subscriptionController.handleSubscriptionDispute);

module.exports = router;