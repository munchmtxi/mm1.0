'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/munch/subscriptionController');
const subscriptionValidator = require('@validators/customer/munch/subscriptionValidator');
const subscriptionMiddleware = require('@middleware/customer/munch/subscriptionMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/subscription/enroll:
 *   post:
 *     summary: Enroll in a subscription plan
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription enrolled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     planId:
 *                       type: string
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Customer not found
 */
/**
 * @swagger
 * /api/customer/munch/subscription/manage:
 *   put:
 *     summary: Manage subscription (upgrade, downgrade, pause, cancel)
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: Action to perform (UPGRADE, DOWNGRADE, PAUSE, CANCEL)
 *               newPlanId:
 *                 type: string
 *                 description: New plan ID for upgrade/downgrade
 *               pauseDurationDays:
 *                 type: integer
 *                 description: Pause duration in days
 *     responses:
 *       200:
 *         description: Subscription managed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     newPlanId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     refundAmount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Subscription not found
 */
/**
 * @swagger
 * /api/customer/munch/subscription/tiers:
 *   get:
 *     summary: Track subscription tiers
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription tier details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     planId:
 *                       type: string
 *                     tier:
 *                       type: string
 *                     status:
 *                       type: string
 *                     endDate:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Subscription not found
 */

router.post('/enroll', subscriptionMiddleware.enrollSubscription, validate(subscriptionValidator.enrollSubscriptionSchema), subscriptionController.enrollSubscription);
router.put('/manage', subscriptionMiddleware.manageSubscription, validate(subscriptionValidator.manageSubscriptionSchema), subscriptionController.manageSubscription);
router.get('/tiers', subscriptionMiddleware.trackSubscriptionTiers, validate(subscriptionValidator.trackSubscriptionTiersSchema), subscriptionController.trackSubscriptionTiers);

module.exports = router;