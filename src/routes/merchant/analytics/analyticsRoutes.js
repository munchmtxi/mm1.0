'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('@controllers/merchant/analytics/analyticsController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const analyticsValidator = require('@validators/merchant/analytics/analyticsValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_analytics'));

/**
 * @swagger
 * /merchant/analytics/{customerId}/behavior:
 *   get:
 *     summary: Track customer behavior
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer behavior tracked successfully
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
 *                     customerId:
 *                       type: string
 *                     behavior:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: integer
 *                         bookings:
 *                           type: integer
 *                         rideFrequency:
 *                           type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 */
router.get('/:customerId/behavior', analyticsValidator.validateTrackCustomerBehavior, analyticsController.trackCustomerBehavior);

/**
 * @swagger
 * /merchant/analytics/{customerId}/spending-trends:
 *   get:
 *     summary: Analyze customer spending trends
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Spending trends analyzed successfully
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
 *                     customerId:
 *                       type: string
 *                     trends:
 *                       type: object
 *                       properties:
 *                         totalSpent:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *                         orderCount:
 *                           type: integer
 *                         topItems:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 */
router.get('/:customerId/spending-trends', analyticsValidator.validateAnalyzeSpendingTrends, analyticsController.analyzeSpendingTrends);

/**
 * @swagger
 * /merchant/analytics/{customerId}/recommendations:
 *   get:
 *     summary: Provide personalized recommendations
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Recommendations provided successfully
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
 *                     customerId:
 *                       type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                           description:
 *                             type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 */
router.get('/:customerId/recommendations', analyticsValidator.validateProvideRecommendations, analyticsController.provideRecommendations);

module.exports = router;