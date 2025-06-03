'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/mtxi/subscriptionController');
const subscriptionValidation = require('@middleware/customer/mtxi/subscriptionValidation');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Customer subscription management for mtxi service
 */
router.use(authenticate, restrictTo('customer'));

/**
 * @swagger
 * /api/customer/mtxi/subscriptions:
 *   post:
 *     summary: Enroll in a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - serviceType
 *               - paymentMethodId
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [BASIC, PREMIUM]
 *               serviceType:
 *                 type: string
 *                 enum: [mtxi, munch, mtables]
 *               paymentMethodId:
 *                 type: integer
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Enrollment failed
 */
router
  .route('/')
  .post(
    checkPermissions('create_subscription'),
    subscriptionValidation.validateEnrollSubscription,
    subscriptionController.enrollSubscription
  );

/**
 * @swagger
 * /api/customer/mtxi/subscriptions/manage:
 *   post:
 *     summary: Manage a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - action
 *             properties:
 *               subscriptionId:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [UPGRADE, PAUSE]
 *               newPlanId:
 *                 type: string
 *                 enum: [BASIC, PREMIUM]
 *               paymentMethodId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Subscription updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Subscription management failed
 */
router
  .route('/manage')
  .post(
    checkPermissions('manage_subscription'),
    subscriptionValidation.validateManageSubscription,
    subscriptionController.manageSubscription
  );

/**
 * @swagger
 * /api/customer/mtxi/subscriptions/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *             properties:
 *               subscriptionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Cancellation failed
 */
router
  .route('/cancel')
  .post(
    checkPermissions('cancel_subscription'),
    subscriptionValidation.validateCancelSubscription,
    subscriptionController.cancelSubscription
  );

/**
 * @swagger
 * /api/customer/mtxi/subscriptions/tiers:
 *   get:
 *     summary: Track subscription tiers
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription tiers retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     subscriptionId:
 *                       type: integer
 *                       nullable: true
 *                     serviceType:
 *                       type: string
 *                       nullable: true
 *                     plan:
 *                       type: string
 *                       nullable: true
 *                     tier:
 *                       type: string
 *                       nullable: true
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: string
 *                     sharingEnabled:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: Tier tracking failed
 */
router
  .route('/tiers')
  .get(
    checkPermissions('view_subscription'),
    subscriptionController.trackSubscriptionTiers
  );

/**
 * @swagger
 * /api/customer/mtxi/subscriptions/history:
 *   get:
 *     summary: Retrieve subscription history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       service_type:
 *                         type: string
 *                       plan:
 *                         type: string
 *                       status:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                       end_date:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       400:
 *         description: History retrieval failed
 */
router
  .route('/history')
  .get(
    checkPermissions('view_subscription'),
    subscriptionController.getSubscriptionHistory
  );

module.exports = router;