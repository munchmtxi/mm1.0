'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/mtxi/subscriptionController');
const subscriptionMiddleware = require('@middleware/customer/mtxi/subscriptionMiddleware');
const authMiddleware = require('@middleware/common/authMiddleware');
const { check, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

// Input validation middleware
const validateShareSubscription = [
  check('friendId').isInt({ min: 1 }).withMessage('Friend ID must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Share subscription validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError(`Invalid input: ${errors.array().map(e => e.msg).join(', ')}`, 400, 'INVALID_INPUT'));
    }
    next();
  },
];

const validateShareResponse = [
  check('accept').isBoolean().withMessage('Accept must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Share response validation failed', { errors: errors.array(), userId: req.user?.id });
      return next(new AppError(`Invalid input: ${errors.array().map(e => e.msg).join(', ')}`, 400, 'INVALID_INPUT'));
    }
    next();
  },
];

// Protect all routes and restrict to customer role
router.use(authMiddleware.authenticate, authMiddleware.restrictTo('customer'));

router.post('/', subscriptionController.createSubscription);
router.post('/:subscriptionId/share', subscriptionMiddleware.validateSubscriptionOwnership, validateShareSubscription, subscriptionController.shareSubscription);
router.patch('/:subscriptionId/share', subscriptionMiddleware.validateSubscriptionShareResponse, validateShareResponse, subscriptionController.respondToSubscriptionShare);

module.exports = router;