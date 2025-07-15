'use strict';

const express = require('express');
const router = express.Router();
const multiBranchAnalyticsController = require('@controllers/merchant/analytics/multiBranchAnalyticsController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const multiBranchAnalyticsValidator = require('@validators/merchant/analytics/multiBranchAnalyticsValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_analytics'));

/**
 * @swagger
 * /merchant/analytics/branches/{merchantId}/aggregate:
 *   get:
 *     summary: Aggregate data across all branches
 *     tags: [Multi-Branch Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Branch data aggregated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     aggregatedData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId:
 *                             type: string
 *                           branchName:
 *                             type: string
 *                           totalOrders:
 *                             type: integer
 *                           totalRevenue:
 *                             type: number
 *                           averageOrderValue:
 *                             type: string
 *                           customerSentiment:
 *                             type: object
 *                             properties:
 *                               positive_reviews:
 *                                 type: integer
 *                               negative_reviews:
 *                                 type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant or branches not found
 */
router.get('/:merchantId/aggregate', multiBranchAnalyticsValidator.validateAggregateBranchData, multiBranchAnalyticsController.aggregateBranchData);

/**
 * @swagger
 * /merchant/analytics/branches/{merchantId}/compare:
 *   get:
 *     summary: Compare performance across branches
 *     tags: [Multi-Branch Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Branch performance compared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     ranked:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId:
 *                             type: string
 *                           branchName:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                           orders:
 *                             type: integer
 *                           customerRetention:
 *                             type: number
 *                           performanceScore:
 *                             type: number
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant or branches not found
 */
router.get('/:merchantId/compare', multiBranchAnalyticsValidator.validateCompareBranchPerformance, multiBranchAnalyticsController.compareBranchPerformance);

/**
 * @swagger
 * /merchant/analytics/branches/{merchantId}/reports:
 *   get:
 *     summary: Generate multi-branch performance reports
 *     tags: [Multi-Branch Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Multi-branch reports generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     report:
 *                       type: object
 *                       properties:
 *                         branches:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               branchId:
 *                                 type: string
 *                               branchName:
 *                                 type: string
 *                               totalRevenue:
 *                                 type: number
 *                               totalOrders:
 *                                 type: integer
 *                               averageRating:
 *                                 type: number
 *                               peakHours:
 *                                 type: object
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalRevenue:
 *                               type: number
 *                             totalOrders:
 *                               type: integer
 *                             branchCount:
 *                               type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant or branches not found
 */
router.get('/:merchantId/reports', multiBranchAnalyticsValidator.validateGenerateMultiBranchReports, multiBranchAnalyticsController.generateMultiBranchReports);

/**
 * @swagger
 * /merchant/analytics/branches/{merchantId}/allocate:
 *   get:
 *     summary: Suggest resource allocation for branches
 *     tags: [Multi-Branch Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Resource allocation suggested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           branchId:
 *                             type: string
 *                           branchName:
 *                             type: string
 *                           resourceScore:
 *                             type: number
 *                           suggestedStaff:
 *                             type: integer
 *                           suggestedInventory:
 *                             type: integer
 *                           resourcePercentage:
 *                             type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant or branches not found
 */
router.get('/:merchantId/allocate', multiBranchAnalyticsValidator.validateAllocateResources, multiBranchAnalyticsController.allocateResources);

module.exports = router;