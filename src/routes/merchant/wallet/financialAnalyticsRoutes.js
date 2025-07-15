// financialAnalyticsRoutes.js
// API routes for merchant financial analytics operations.

'use strict';

const express = require('express');
const router = express.Router();
const financialAnalyticsController = require('@controllers/merchant/wallet/financialAnalyticsController');
const financialAnalyticsMiddleware = require('@middleware/merchant/wallet/financialAnalyticsMiddleware');

/**
 * @swagger
 * /merchant/wallet/analytics/track:
 *   post:
 *     summary: Track financial transactions for a merchant
 *     tags: [Merchant Financial Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - period
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               period:
 *                 type: string
 *                 description: Time period (daily, weekly, monthly)
 *                 enum: [daily, weekly, monthly]
 *     responses:
 *       200:
 *         description: Financial transactions tracked successfully
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
 *                     payments:
 *                       type: number
 *                     payouts:
 *                       type: number
 *                     transactionCount:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/track', financialAnalyticsMiddleware.validateTrackFinancialTransactions, financialAnalyticsController.trackFinancialTransactions);

/**
 * @swagger
 * /merchant/wallet/analytics/report:
 *   post:
 *     summary: Generate a financial report for a merchant
 *     tags: [Merchant Financial Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - period
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               period:
 *                 type: string
 *                 description: Time period (daily, weekly, monthly)
 *                 enum: [daily, weekly, monthly]
 *     responses:
 *       200:
 *         description: Financial report generated successfully
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
 *                     revenue:
 *                       type: number
 *                     payouts:
 *                       type: number
 *                     orderCount:
 *                       type: integer
 *                     payoutCount:
 *                       type: integer
 *                     period:
 *                       type: string
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/report', financialAnalyticsMiddleware.validateGenerateFinancialReport, financialAnalyticsController.generateFinancialReport);

/**
 * @swagger
 * /merchant/wallet/analytics/trends:
 *   post:
 *     summary: Analyze financial trends for a merchant
 *     tags: [Merchant Financial Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Financial trends analyzed successfully
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
 *                     revenueTrend:
 *                       type: array
 *                       items:
 *                         type: number
 *                     payoutTrend:
 *                       type: array
 *                       items:
 *                         type: number
 *                     averageRevenue:
 *                       type: number
 *                     averagePayouts:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/trends', financialAnalyticsMiddleware.validateAnalyzeFinancialTrends, financialAnalyticsController.analyzeFinancialTrends);

/**
 * @swagger
 * /merchant/wallet/analytics/goals:
 *   post:
 *     summary: Recommend financial goals for a merchant
 *     tags: [Merchant Financial Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Financial goals recommended successfully
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
 *                     monthlyRevenueTarget:
 *                       type: number
 *                     quarterlyRevenueTarget:
 *                       type: number
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/goals', financialAnalyticsMiddleware.validateRecommendFinancialGoals, financialAnalyticsController.recommendFinancialGoals);

module.exports = router;