// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\subscription\subscriptionRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/merchant/subscription/subscriptionController');
const subscriptionValidator = require('@validators/merchant/subscription/subscriptionValidator');
const subscriptionMiddleware = require('@middleware/merchant/subscription/subscriptionMiddleware');

/**
 * @swagger
 * /api/merchant/subscriptions/{merchantId}/create:
 *   post:
 *     summary: Create a subscription plan
 *     tags: [Merchant Subscriptions]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL']
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *               durationDays:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Subscription plan created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Merchant not found
 */
router.post(
  '/:merchantId/create',
  subscriptionValidator.createSubscriptionPlanValidation,
  subscriptionMiddleware.validateRequest,
  subscriptionController.createSubscriptionPlan,
);

/**
 * @swagger
 * /api/merchant/subscriptions/{customerId}/tiers:
 *   get:
 *     summary: Track subscription tiers for a customer
 *     tags: [Merchant Subscriptions]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     responses:
 *       200:
 *         description: Subscription tiers retrieved successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Customer not found
 */
router.get(
  '/:customerId/tiers',
  subscriptionValidator.trackSubscriptionTiersValidation,
  subscriptionMiddleware.validateRequest,
  subscriptionController.trackSubscriptionTiers,
);

/**
 * @swagger
 * /api/merchant/subscriptions/{customerId}/manage:
 *   patch:
 *     summary: Manage customer subscriptions (enroll, upgrade, cancel)
 *     tags: [Merchant Subscriptions]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: integer
 *               operation:
 *                 type: string
 *                 enum: [enroll, upgrade, cancel]
 *     responses:
 *       200:
 *         description: Subscription managed successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Unauthorized operation
 *       404:
 *         description: Customer or subscription not found
 */
router.patch(
  '/:customerId/manage',
  subscriptionValidator.manageSubscriptionsValidation,
  subscriptionMiddleware.validateRequest,
  subscriptionController.manageSubscriptions,
);

module.exports = router;