'use strict';

const express = require('express');
const router = express.Router();
const configurationController = require('@controllers/admin/mtables/configurationController');
const configurationMiddleware = require('@middleware/admin/mtables/configurationMiddleware');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/configuration/table-rules/{restaurantId}:
 *   put:
 *     summary: Set table assignment rules for a restaurant
 *     description: Updates table assignment policies, such as auto-assignment and capacity limits.
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoAssign:
 *                 type: boolean
 *                 description: Enable auto-assignment of tables
 *               minCapacity:
 *                 type: integer
 *                 description: Minimum party size
 *               maxCapacity:
 *                 type: integer
 *                 description: Maximum party size
 *               preferredLocation:
 *                 type: string
 *                 description: Preferred table location (e.g., indoor, outdoor)
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Table rules updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: integer
 *                     rules:
 *                       type: object
 *                       properties:
 *                         autoAssign:
 *                           type: boolean
 *                         minCapacity:
 *                           type: integer
 *                           nullable: true
 *                         maxCapacity:
 *                           type: integer
 *                           nullable: true
 *                         preferredLocation:
 *                           type: string
 *                           nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID, capacity, or location type
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/table-rules/:restaurantId',
  configurationMiddleware.validateSetTableRules,
  configurationMiddleware.checkManageSettingsPermission,
  configurationController.setTableRules
);

/**
 * @swagger
 * /admin/mtables/configuration/gamification/{restaurantId}:
 *   put:
 *     summary: Configure gamification rules for a restaurant
 *     description: Sets point values and wallet credits for gamification actions.
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: object
 *               properties:
 *                 points:
 *                   type: number
 *                   minimum: 0
 *                 walletCredit:
 *                   type: number
 *                   minimum: 0
 *               required: [points, walletCredit]
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Gamification rules updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: integer
 *                     gamificationRules:
 *                       type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID or gamification rules
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/gamification/:restaurantId',
  configurationMiddleware.validateConfigureGamificationRules,
  configurationMiddleware.checkManageSettingsPermission,
  configurationController.configureGamificationRules
);

/**
 * @swagger
 * /admin/mtables/configuration/waitlist/{restaurantId}:
 *   put:
 *     summary: Update waitlist settings for a restaurant
 *     description: Adjusts waitlist policies, such as maximum waitlist size and notification intervals.
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxWaitlist:
 *                 type: integer
 *                 description: Maximum number of waitlist entries
 *               notificationInterval:
 *                 type: integer
 *                 description: Notification interval in minutes (5-60)
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Waitlist settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: integer
 *                     waitlistSettings:
 *                       type: object
 *                       properties:
 *                         maxWaitlist:
 *                           type: integer
 *                         notificationInterval:
 *                           type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID, waitlist limit, or notification interval
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/waitlist/:restaurantId',
  configurationMiddleware.validateUpdateWaitlistSettings,
  configurationMiddleware.checkManageSettingsPermission,
  configurationController.updateWaitlistSettings
);

/**
 * @swagger
 * /admin/mtables/configuration/pricing/{restaurantId}:
 *   put:
 *     summary: Configure pricing models for a restaurant
 *     description: Sets deposit percentages and service fees for bookings.
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               depositPercentage:
 *                 type: number
 *                 description: Deposit percentage for bookings
 *               serviceFee:
 *                 type: number
 *                 description: Service fee amount
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Pricing models updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurantId:
 *                       type: integer
 *                     pricingModels:
 *                       type: object
 *                       properties:
 *                         depositPercentage:
 *                           type: number
 *                         serviceFee:
 *                           type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID, deposit percentage, or service fee
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/pricing/:restaurantId',
  configurationMiddleware.validateConfigurePricingModels,
  configurationMiddleware.checkManageSettingsPermission,
  configurationController.configurePricingModels
);

module.exports = router;