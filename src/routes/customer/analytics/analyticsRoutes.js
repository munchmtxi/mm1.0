'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('@controllers/customer/analytics/analyticsController');
const analyticsMiddleware = require('@middleware/customer/analytics/analyticsMiddleware');
const analyticsValidator = require('@validators/customer/analytics/analyticsValidator');

/**
 * @swagger
 * /api/customer/analytics/behavior/{customerId}:
 *   post:
 *     summary: Track customer behavior
 *     description: Tracks customer behavior based on bookings, orders, rides, and parking over the last 30 days.
 *     tags:
 *       - Customer Analytics
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 description: ID of the customer (alternative to path parameter)
 *                 example: 123
 *     responses:
 *       200:
 *         description: Behavior tracked successfully
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
 *                   example: Customer behavior tracked for customer 123
 *                 data:
 *                   type: object
 *                   properties:
 *                     behavior:
 *                       type: object
 *                       properties:
 *                         bookingFrequency:
 *                           type: integer
 *                           example: 5
 *                         orderFrequency:
 *                           type: integer
 *                           example: 10
 *                         rideFrequency:
 *                           type: integer
 *                           example: 3
 *                         parkingFrequency:
 *                           type: integer
 *                           example: 2
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-06-27T10:45:00.000Z
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Behavior tracking failed
 */

/**
 * @swagger
 * /api/customer/analytics/spending/{customerId}:
 *   post:
 *     summary: Analyze customer spending trends
 *     description: Analyzes spending trends over the last 90 days, including payments, subscriptions, and promotions.
 *     tags:
 *       - Customer Analytics
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 description: ID of the customer (alternative to path parameter)
 *                 example: 123
 *     responses:
 *       200:
 *         description: Spending trends analyzed successfully
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
 *                   example: Spending trends analyzed for customer 123
 *                 data:
 *                   type: object
 *                   properties:
 *                     trends:
 *                       type: object
 *                       properties:
 *                         totalSpent:
 *                           type: string
 *                           example: "1500.00"
 *                         transactionCount:
 *                           type: integer
 *                           example: 20
 *                         averageTransaction:
 *                           type: string
 *                           example: "75.00"
 *                         activeSubscriptions:
 *                           type: integer
 *                           example: 2
 *                         promotionRedemptions:
 *                           type: integer
 *                           example: 5
 *                         currency:
 *                           type: string
 *                           example: USD
 *                         period:
 *                           type: string
 *                           example: monthly
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Spending analysis failed
 */

/**
 * @swagger
 * /api/customer/analytics/recommendations/{customerId}:
 *   post:
 *     summary: Provide personalized recommendations
 *     description: Provides personalized product recommendations based on customer preferences and feedback.
 *     tags:
 *       - Customer Analytics
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 description: ID of the customer (alternative to path parameter)
 *                 example: 123
 *     responses:
 *       200:
 *         description: Recommendations provided successfully
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
 *                   example: Provided 3 recommendations for customer 123
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               productId:
 *                                 type: integer
 *                                 example: 456
 *                               recommendationType:
 *                                 type: string
 *                                 example: restaurants
 *                               eventType:
 *                                 type: string
 *                                 example: purchase
 *                               metadata:
 *                                 type: object
 *                                 example: { dietary: ["vegan"] }
 *                         feedbackSummary:
 *                           type: object
 *                           properties:
 *                             ratingTotal:
 *                               type: integer
 *                               example: 40
 *                             feedbackCount:
 *                               type: integer
 *                               example: 10
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Recommendation failed
 */

/**
 * @swagger
 * /api/customer/analytics/parking/{customerId}:
 *   post:
 *     summary: Track customer parking behavior
 *     description: Tracks customer parking behavior over the last 30 days.
 *     tags:
 *       - Customer Analytics
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 description: ID of the customer (alternative to path parameter)
 *                 example: 123
 *     responses:
 *       200:
 *         description: Parking behavior tracked successfully
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
 *                   example: Parking behavior tracked for customer 123
 *                 data:
 *                   type: object
 *                   properties:
 *                     behavior:
 *                       type: object
 *                       properties:
 *                         parkingFrequency:
 *                           type: integer
 *                           example: 2
 *                         preferredSpaceTypes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 example: HOURLY
 *                               count:
 *                                 type: integer
 *                                 example: 1
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-06-27T10:45:00.000Z
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *       400:
 *         description: Parking behavior tracking failed
 */

router.post(
  '/behavior/:customerId',
  analyticsValidator.validateAnalytics,
  analyticsMiddleware.validateAnalyticsAccess,
  analyticsController.trackBehavior
);

router.post(
  '/spending/:customerId',
  analyticsValidator.validateAnalytics,
  analyticsMiddleware.validateAnalyticsAccess,
  analyticsController.analyzeSpending
);

router.post(
  '/recommendations/:customerId',
  analyticsValidator.validateAnalytics,
  analyticsMiddleware.validateAnalyticsAccess,
  analyticsController.getRecommendations
);

router.post(
  '/parking/:customerId',
  analyticsValidator.validateAnalytics,
  analyticsMiddleware.validateAnalyticsAccess,
  analyticsController.trackParkingBehavior
);

module.exports = router;