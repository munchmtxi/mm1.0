'use strict';

const express = require('express');
const router = express.Router();
const {
  trackOrderTrendsAuth,
  monitorDeliveryPerformanceAuth,
  aggregateCustomerInsightsAuth,
  trackGamificationAuth,
  analyzeDeliveryLocationsAuth,
} = require('@middleware/merchant/munch/analyticsMiddleware');
const { validateAnalytics } = require('@validators/merchant/munch/analyticsValidator');
const {
  trackOrderTrendsController,
  monitorDeliveryPerformanceController,
  aggregateCustomerInsightsController,
  trackOrderGamificationController,
  analyzeDeliveryLocationsController,
} = require('@controllers/merchant/munch/analyticsController');

/**
 * @swagger
 * /merchant/munch/analytics/order-trends:
 *   post:
 *     summary: Track order trends
 *     description: Analyzes order patterns for a restaurant over a specified period, including count, revenue, and breakdowns by type and status.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - period
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 101
 *               period:
 *                 type: string
 *                 description: Report period
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Order trends retrieved successfully
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
 *                   example: Order trends updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderCount:
 *                       type: integer
 *                       example: 500
 *                     revenue:
 *                       type: number
 *                       example: 12500.50
 *                     byType:
 *                       type: object
 *                       example: { delivery: 300, takeaway: 200 }
 *                     byStatus:
 *                       type: object
 *                       example: { delivered: 450, cancelled: 50 }
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/order-trends', trackOrderTrendsAuth, validateAnalytics, trackOrderTrendsController);

/**
 * @swagger
 * /merchant/munch/analytics/delivery-performance:
 *   post:
 *     summary: Monitor delivery performance
 *     description: Tracks delivery metrics for a restaurant, including total deliveries, average delivery time, on-time rate, and average distance.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - period
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 101
 *               period:
 *                 type: string
 *                 description: Report period
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Delivery performance retrieved successfully
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
 *                   example: Delivery performance updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDeliveries:
 *                       type: integer
 *                       example: 300
 *                     avgDeliveryTime:
 *                       type: number
 *                       example: 25.5
 *                     onTimeRate:
 *                       type: number
 *                       example: 0.95
 *                     avgDistance:
 *                       type: number
 *                       example: 5.2
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/delivery-performance', monitorDeliveryPerformanceAuth, validateAnalytics, monitorDeliveryPerformanceController);

/**
 * @swagger
 * /merchant/munch/analytics/customer-insights:
 *   post:
 *     summary: Aggregate customer insights
 *     description: Aggregates customer data for a restaurant, including total orders, average order value, unique customers, popular items, and unique locations.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - period
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 101
 *               period:
 *                 type: string
 *                 description: Report period
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Customer insights retrieved successfully
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
 *                   example: Customer insights updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                       example: 500
 *                     avgOrderValue:
 *                       type: number
 *                       example: 25.0
 *                     uniqueCustomers:
 *                       type: integer
 *                       example: 150
 *                     popularItems:
 *                       type: object
 *                       example: { "Burger": 200, "Pizza": 150 }
 *                     uniqueLocations:
 *                       type: integer
 *                       example: 50
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/customer-insights', aggregateCustomerInsightsAuth, validateAnalytics, aggregateCustomerInsightsController);

/**
 * @swagger
 * /merchant/munch/analytics/gamification:
 *   post:
 *     summary: Track order gamification
 *     description: Tracks gamification metrics for a restaurant, including total points awarded, unique users, and points by action.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - period
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 101
 *               period:
 *                 type: string
 *                 description: Report period
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Gamification data retrieved successfully
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
 *                   example: Gamification data updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPoints:
 *                       type: integer
 *                       example: 1000
 *                     uniqueUsers:
 *                       type: integer
 *                       example: 50
 *                     pointsByAction:
 *                       type: object
 *                       example: { order_placed: 600, order_completed: 400 }
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/gamification', trackGamificationAuth, validateAnalytics, trackOrderGamificationController);

/**
 * @swagger
 * /merchant/munch/analytics/delivery-locations:
 *   post:
 *     summary: Analyze delivery locations
 *     description: Analyzes delivery location data for a restaurant, including total deliveries, unique cities, and average confidence level.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - period
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: ID of the merchant branch
 *                 example: 101
 *               period:
 *                 type: string
 *                 description: Report period
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Delivery locations analyzed successfully
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
 *                   example: Delivery locations updated for restaurant 101.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDeliveries:
 *                       type: integer
 *                       example: 300
 *                     uniqueCities:
 *                       type: integer
 *                       example: 5
 *                     avgConfidenceLevel:
 *                       type: number
 *                       example: 0.8
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/delivery-locations', analyzeDeliveryLocationsAuth, validateAnalytics, analyzeDeliveryLocationsController);

module.exports = router;