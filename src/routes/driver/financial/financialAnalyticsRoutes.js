'use strict';

const express = require('express');
const router = express.Router();
const {
  getEarningsTrends,
  getFinancialSummary,
  recommendFinancialGoals,
  compareFinancialPerformance,
} = require('@controllers/driver/financial/financialAnalyticsController');
const {
  validateGetEarningsTrends,
  validateGetFinancialSummary,
  validateRecommendFinancialGoals,
  validateCompareFinancialPerformance,
} = require('@middleware/driver/financial/financialAnalyticsMiddleware');

/**
 * @swagger
 * /driver/financial/earnings-trends:
 *   get:
 *     summary: Retrieve driver earnings trends
 *     tags: [Driver Financial Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Earnings trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       amount:
 *                         type: number
 *       400:
 *         description: Invalid period
 *       404:
 *         description: Driver or wallet not found
 *       500:
 *         description: Server error
 */
router.get('/earnings-trends', validateGetEarningsTrends, getEarningsTrends);

/**
 * @swagger
 * /driver/financial/summary:
 *   get:
 *     summary: Retrieve driver financial summary
 *     tags: [Driver Financial Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     totalEarnings:
 *                       type: number
 *                     totalPayouts:
 *                       type: number
 *                     totalTaxes:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     period:
 *                       type: string
 *       404:
 *         description: Driver or wallet not found
 *       500:
 *         description: Server error
 */
router.get('/summary', validateGetFinancialSummary);

/**
 * @swagger
 * /driver/financial/goals:
 *   get:
 *     summary: Retrieve recommended financial goals
 *     tags: [Driver Financial Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial goals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     monthlyEarningsGoal:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     recommendation:
 *                       type: string
 *       404:
 *         description: Driver or wallet not found
 *       500:
 *         description: Server error
 */
router.get('/goals', validateRecommendFinancialGoals, recommendFinancialGoals);

/**
 * @swagger
 * /driver/financial/performance:
 *   get:
 *     summary: Compare driver financial performance with peers
 *     tags: [Driver Financial Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: peers
 *         required: true
 *         schema:
 *           type: string
 *           enum: [city, country]
 *     responses:
 *       200:
 *         description: Financial comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     driverEarnings:
 *                       type: number
 *                     peerAverageEarnings:
 *                       type: number
 *                     peerGroup:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     performance:
 *                       type: string
 *       400:
 *         description: Invalid peer group
 *       404:
 *         description: Driver or wallet not found
 *       500:
 *         description: Server error
 */
router.get('/performance', validateCompareFinancialPerformance, compareFinancialPerformance);

module.exports = router;