'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('@controllers/merchant/mtables/analyticsController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const analyticsValidator = require('@validators/merchant/mtables/analyticsValidator');
const { restrictAnalyticsAccess } = require('@middleware/merchant/mtables/analyticsMiddleware');

router.use(authenticate);
router.use(restrictAnalyticsAccess);

/**
 * @swagger
 * /merchant/mtables/{restaurantId}/sales:
 *   post:
 *     summary: Track sales for bookings and orders
 *     tags: [MtablesAnalytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Sales tracked successfully
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
 *                     totalGuests:
 *                       type: integer
 *                     totalBookings:
 *                       type: integer
 *                     totalRevenue:
 *                       type: number
 *                     totalOrders:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 */
router.post('/:restaurantId/sales', restrictTo('merchant'), checkPermissions('view_analytics'), analyticsValidator.validateTrackSales, analyticsController.trackSales);

/**
 * @swagger
 * /merchant/mtables/{restaurantId}/booking-trends:
 *   post:
 *     summary: Analyze booking trends
 *     tags: [MtablesAnalytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Booking trends analyzed successfully
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
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           bookingCount:
 *                             type: integer
 *                           guestCount:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           seatingPreference:
 *                             type: string
 *                           tableType:
 *                             type: string
 *                           locationType:
 *                             type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 */
router.post('/:restaurantId/booking-trends', restrictTo('merchant'), checkPermissions('view_analytics'), analyticsValidator.validateAnalyzeBookingTrends, analyticsController.analyzeBookingTrends);

/**
 * @swagger
 * /merchant/mtables/{restaurantId}/reports:
 *   get:
 *     summary: Generate booking reports
 *     tags: [MtablesAnalytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Report generated successfully
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
 *                     sales:
 *                       type: object
 *                       properties:
 *                         totalGuests:
 *                           type: integer
 *                         totalBookings:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         totalOrders:
 *                           type: integer
 *                     bookingTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                     generatedAt:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 */
router.get('/:restaurantId/reports', restrictTo('merchant'), checkPermissions('view_analytics'), analyticsValidator.validateGenerateBookingReports, analyticsController.generateBookingReports);

/**
 * @swagger
 * /merchant/mtables/{restaurantId}/engagement:
 *   get:
 *     summary: Analyze customer engagement
 *     tags: [MtablesAnalytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Customer engagement analyzed successfully
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
 *                     topEngaged:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           bookingCount:
 *                             type: integer
 *                           orderCount:
 *                             type: integer
 *                           engagementScore:
 *                             type: integer
 *                     totalCustomers:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 */
router.get('/:restaurantId/engagement', restrictTo('merchant'), checkPermissions('view_analytics'), analyticsValidator.validateAnalyzeCustomerEngagement, analyticsController.analyzeCustomerEngagement);

module.exports = router;