'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/munch/subscriptionController');
const subscriptionValidator = require('@validators/customer/munch/subscriptionValidator');
const subscriptionMiddleware = require('@middleware/customer/munch/subscriptionMiddleware');

/**
 * @swagger
 * tags:
 *   name: Customer Subscriptions
 *   description: Customer subscription management APIs
 */

/**
 * @swagger
 * /customer/munch/subscriptions/enroll:
 *   post:
 *     summary: Enroll in a subscription plan
 *     tags: [Customer Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planId
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *                 example: 1
 *               planId:
 *                 type: integer
 *                 description: Subscription plan ID
 *                 example: 1
 *               serviceType:
 *                 type: string
 *                 description: Service type (default: munch)
 *                 example: munch
 *               menuItemId:
 *                 type: integer
 *                 description: Optional menu item ID
 *                 example: 100
 *     responses:
 *       201:
 *         description: Subscription enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     plan:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: string
 *                     menuItemId:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/enroll', subscriptionValidator.enrollSubscription, subscriptionMiddleware.checkActiveSubscriptions, subscriptionController.enrollSubscription);

/**
 * @swagger
 * /customer/munch/subscriptions/manage:
 *   put:
 *     summary: Manage subscription (upgrade, downgrade, pause, cancel)
 *     tags: [Customer Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - action
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *                 example: 1
 *               action:
 *                 type: string
 *                 enum: [UPGRADE, DOWNGRADE, PAUSE, CANCEL]
 *                 description: Action to perform
 *                 example: UPGRADE
 *               newPlanId:
 *                 type: integer
 *                 description: Required for UPGRADE or DOWNGRADE
 *                 example: 2
 *               pauseDurationDays:
 *                 type: integer
 *                 description: Required for PAUSE (1-90 days)
 *                 example: 30
 *               menuItemId:
 *                 type: integer
 *                 description: Optional menu item ID
 *                 example: 100
 *     responses:
 *       200:
 *         description: Subscription managed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     plan:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     newStatus:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     refundAmount:
 *                       type: number
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: string
 *                     menuItemId:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.put('/manage', subscriptionValidator.manageSubscription, subscriptionMiddleware.checkActiveSubscriptions, subscriptionController.manageSubscription);

/**
 * @swagger
 * /customer/munch/subscriptions/track/{userId}:
 *   get:
 *     summary: Track subscription tiers for a user
 *     tags: [Customer Subscriptions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Subscription details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     plan:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     sharingEnabled:
 *                       type: boolean
 *                     endDate:
 *                       type: string
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: string
 *                     menuItem:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/track/:userId', subscriptionValidator.trackSubscriptionTiers, subscriptionController.trackSubscriptionTiers);

/**
 * @swagger
 * /customer/munch/subscriptions/renew/{subscriptionId}:
 *   put:
 *     summary: Renew a subscription
 *     tags: [Customer Subscriptions]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     plan:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: string
 *                     menuItemId:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.put('/renew/:subscriptionId', subscriptionValidator.renewSubscription, subscriptionMiddleware.checkActiveSubscriptions, subscriptionController.renewSubscription);

module.exports = router;