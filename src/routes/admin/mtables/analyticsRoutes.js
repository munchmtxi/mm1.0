'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('@controllers/admin/mtables/analyticsController');
const analyticsMiddleware = require('@middleware/admin/mtables/analyticsMiddleware');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/analytics/bookings/{restaurantId}:
 *   get:
 *     summary: Retrieve booking analytics for a restaurant
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     responses:
 *       200:
 *         description: Booking analytics retrieved successfully
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
 *                     totalBookings:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/bookings/:restaurantId',
  analyticsMiddleware.validateGetBookingAnalytics,
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsController.getBookingAnalytics
);

/**
 * @swagger
 * /admin/mtables/analytics/reports/{restaurantId}:
 *   get:
 *     summary: Export booking reports for a restaurant
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     responses:
 *       200:
 *         description: Booking report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookingId:
 *                         type: integer
 *                       customerId:
 *                         type: integer
 *                       customerName:
 *                         type: string
 *                       date:
 *                         type: string
 *                       time:
 *                         type: string
 *                       guestCount:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       feedbackRating:
 *                         type: integer
 *                         nullable: true
 *                       feedbackComment:
 *                         type: string
 *                         nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/reports/:restaurantId',
  analyticsMiddleware.validateExportBookingReports,
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsController.exportBookingReports
);

/**
 * @swagger
 * /admin/mtables/analytics/engagement/{restaurantId}:
 *   get:
 *     summary: Analyze customer engagement for a restaurant
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     responses:
 *       200:
 *         description: Customer engagement analyzed successfully
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
 *                     totalBookings:
 *                       type: integer
 *                     feedbackRate:
 *                       type: number
 *                     averageRating:
 *                       type: number
 *                     repeatCustomerCount:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/engagement/:restaurantId',
  analyticsMiddleware.validateAnalyzeCustomerEngagement,
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsController.analyzeCustomerEngagement
);

/**
 * @swagger
 * /admin/mtables/analytics/gamification/{restaurantId}:
 *   get:
 *     summary: Track gamification metrics for a restaurant
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     responses:
 *       200:
 *         description: Gamification metrics tracked successfully
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
 *                     totalPoints:
 *                       type: integer
 *                     pointsByAction:
 *                       type: object
 *                     activeUsers:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/gamification/:restaurantId',
  analyticsMiddleware.validateTrackGamificationMetrics,
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsController.trackGamificationMetrics
);

module.exports = router;