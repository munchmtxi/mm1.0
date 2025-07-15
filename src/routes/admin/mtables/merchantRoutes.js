'use strict';

const express = require('express');
const router = express.Router();
const merchantController = require('@controllers/admin/mtables/merchantController');
const merchantMiddleware = require('@middleware/admin/mtables/merchantMiddleware');
const merchantConstants = require('@constants/merchantConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/merchants/{merchantId}:
 *   put:
 *     summary: Approve merchant onboarding
 *     description: Verifies and approves a merchant's setup for onboarding, activating their account.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant
 *     responses:
 *       200:
 *         description: Merchant onboarding approved successfully
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
 *                     merchantId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid merchant ID or missing compliance documents
 *       403:
 *         description: Permission denied or merchant already active
 *       404:
 *         description: Merchant not found
 */
router.put(
  '/:merchantId',
  merchantMiddleware.validateApproveMerchantOnboarding,
  merchantMiddleware.checkManageMerchantPermission,
  merchantController.approveMerchantOnboarding
);

/**
 * @swagger
 * /admin/mtables/merchants/{restaurantId}/menu:
 *   put:
 *     summary: Manage menu updates
 *     description: Approves or updates menu items for a restaurant branch.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the restaurant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dietaryFilters:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Dietary filters (e.g., vegan, gluten-free)
 *             required: [items]
 *     responses:
 *       200:
 *         description: Menu updated successfully
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
 *                     menuItems:
 *                       type: integer
 *                     itemCount:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID, menu items, or dietary filters
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/:restaurantId/menu',
  merchantMiddleware.validateManageMenus,
  merchantMiddleware.checkManageMerchantPermission,
  merchantController.manageMenus
);

/**
 * @swagger
 * /admin/mtables/merchants/{restaurantId}/policies:
 *   put:
 *     summary: Configure reservation policies
 *     description: Sets booking and reservation policies for a restaurant branch.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the restaurant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minBookingHours:
 *                 type: number
 *                 description: Minimum booking hours
 *               maxBookingHours: *                 type: number
 *                 description: Maximum booking hours
 *               cancellationWindowHours:
 *                 type: number
 *                 description: Cancellation window in hours
 *               depositPercentage:
 *                 type: number
 *                 description: Deposit percentage
 *     responses:
 *       200:
 *         description: Reservation policies updated successfully
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
 *                     policies:
 *                       type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID or policies
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.put(
  '/:restaurantId/policies',
  merchantMiddleware.validateConfigureReservationPolicies,
  merchantMiddleware.checkManageMerchantPermission,
  merchantController.configureReservationPolicies
);

/**
 * @swagger
 * /admin/mtables/merchants/{merchantId}/performance:
 *   get:
 *     summary: Monitor branch performance
 *     description: Retrieves performance metrics for a merchant's branches.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
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
 *                     merchantId: merchant
 *                       type: integer
 *                     performanceSummary: array
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                           orders:
 *                             type: integer
 *                           averageOrderValue:
 *                             type: number
 *                           customerRetention:
 *                             type: number
 *                           sentiment:
 *                             type: object
 *                           performanceScores:
 *                             type: object
 *                 message:
 *                           type: string
 *       400:
 *         description: Invalid merchant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Merchant not found
 */
router.get(
  '/:merchantId/performance',
  merchantMiddleware.validateMonitorBranchPerformance,
  merchantMiddleware.checkManageMerchantPermission,
  merchantController.monitorBranchPerformance
);

module.exports = router;