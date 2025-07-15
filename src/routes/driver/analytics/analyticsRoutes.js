'use strict';

const express = require('express');
const router = express.Router();
const {
  getPerformanceMetrics,
  generateAnalyticsReport,
  getRecommendations,
  comparePerformance,
} = require('@controllers/driver/analytics/analyticsController');
const {
  validateGetPerformanceMetrics,
  validateGenerateAnalyticsReport,
  validateGetRecommendations,
  validateComparePerformance,
} = require('@middleware/driver/analytics/analyticsMiddleware');

/**
 * @swagger
 * /driver/analytics/performance-metrics:
 *   get:
 *     summary: Retrieve driver performance metrics
 *     tags: [Driver Analytics]
 *     security:
 *       - bearerAuth: []
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
 *                 message:
 *                   type: string
 *                   example: Profile retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     ride_completion_rate:
 *                       type: number
 *                     delivery_completion_rate:
 *                       type: number
 *                     avg_rating:
 *                       type: string
 *                     total_earnings:
 *                       type: number
 *                     active_hours:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/performance-metrics', validateGetPerformanceMetrics, getPerformanceMetrics);

/**
 * @swagger
 * /driver/analytics/report:
 *   post:
 *     summary: Generate driver analytics report
 *     tags: [Driver Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - period
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Analytics report generated successfully
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
 *                     period:
 *                       type: string
 *                     financial:
 *                       type: object
 *                       properties:
 *                         total_earnings:
 *                           type: number
 *                         total_payouts:
 *                           type: number
 *                         total_taxes:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     operational:
 *                       type: object
 *                       properties:
 *                         total_rides:
 *                           type: number
 *                         completed_rides:
 *                           type: number
 *                         total_deliveries:
 *                           type: number
 *                         completed_deliveries:
 *                           type: number
 *                         avg_rating:
 *                           type: string
 *                         total_distance:
 *                           type: number
 *       400:
 *         description: Invalid period
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/report', validateGenerateAnalyticsReport, generateAnalyticsReport);

/**
 * @swagger
 * /driver/analytics/recommendations:
 *   get:
 *     summary: Retrieve driver performance recommendations
 *     tags: [Driver Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
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
 *                   example: Profile retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/recommendations', validateGetRecommendations, getRecommendations);

/**
 * @swagger
 * /driver/analytics/compare-performance:
 *   post:
 *     summary: Compare driver performance with peers
 *     tags: [Driver Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - peers
 *             properties:
 *               peers:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 1
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: Performance comparison completed successfully
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
 *                   example: Profile retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     driver:
 *                       type: object
 *                       properties:
 *                         driver_id:
 *                           type: number
 *                         completion_rate:
 *                           type: number
 *                         avg_rating:
 *                           type: string
 *                         total_earnings:
 *                           type: number
 *                     peers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           driver_id:
 *                             type: number
 *                           completion_rate:
 *                             type: number
 *                           avg_rating:
 *                             type: string
 *                           total_earnings:
 *                             type: number
 *                     stats:
 *                       type: object
 *                       properties:
 *                         avg_completion_rate:
 *                           type: number
 *                         avg_rating:
 *                           type: number
 *                         avg_earnings:
 *                           type: number
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/compare-performance', validateComparePerformance, comparePerformance);

module.exports = router;