'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/mtxi/subscriptionController');
const subscriptionValidation = require('@validators/customer/mtxi/subscriptionValidation');
const subscriptionMiddleware = require('@middleware/customer/mtxi/subscriptionMiddleware');

/**
 * Subscription routes
 */
router.post(
  '/subscriptions',
  subscriptionMiddleware.validateLanguageCode,
  subscriptionValidation.enrollSubscription,
  subscriptionController.enrollSubscription
  /**
   * @swagger
   * /customer/mtxi/subscriptions:
   *   post:
   *     summary: Enroll in a subscription
   *     tags: [Subscription]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               planId: { type: string }
   *               serviceType: { type: string }
   *               walletId: { type: integer }
   *     responses:
   *       201:
   *         description: Subscription enrolled
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object, properties: { subscriptionId: { type: integer } } }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.put(
  '/subscriptions',
  subscriptionMiddleware.validateLanguageCode,
  subscriptionValidation.manageSubscription,
  subscriptionController.manageSubscription
  /**
   * @swagger
   * /customer/mtxi/subscriptions:
   *   put:
   *     summary: Manage subscription (upgrade/downgrade)
   *     tags: [Subscription]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               subscriptionId: { type: integer }
   *               action: { type: string, enum: ['UPGRADE', 'DOWNGRADE'] }
   *               newPlanId: { type: string }
   *     responses:
   *       200:
   *         description: Subscription managed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object, properties: { subscriptionId: { type: integer } } }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.delete(
  '/subscriptions',
  subscriptionMiddleware.validateLanguageCode,
  subscriptionValidation.cancelSubscription,
  subscriptionController.cancelSubscription
  /**
   * @swagger
   * /customer/mtxi/subscriptions:
   *   delete:
   *     summary: Cancel subscription
   *     tags: [Subscription]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               subscriptionId: { type: integer }
   *     responses:
   *       200:
   *         description: Subscription cancelled
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.get(
  '/subscriptions/tiers',
  subscriptionMiddleware.validateLanguageCode,
  subscriptionController.trackSubscriptionTiers
  /**
   * @swagger
   * /customer/mtxi/subscriptions/tiers:
   *   get:
   *     summary: Track subscription tiers
   *     tags: [Subscription]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     responses:
   *       200:
   *         description: Subscription tiers retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Unauthorized
   */
);

router.get(
  '/subscriptions/history',
  subscriptionMiddleware.validateLanguageCode,
  subscriptionController.getSubscriptionHistory
  /**
   * @swagger
   * /customer/mtxi/subscriptions/history:
   *   get:
   *     summary: Get subscription history
   *     tags: [Subscription]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     responses:
   *       200:
   *         description: Subscription history retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: array, items: { type: object } }
   *       403:
   *         description: Unauthorized
   */
);

module.exports = router;