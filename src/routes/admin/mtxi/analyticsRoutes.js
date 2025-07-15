'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('@controllers/admin/mtxi/analyticsController');
const analyticsMiddleware = require('@middleware/admin/mtxi/analyticsMiddleware');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Admin analytics for mtxi ride-sharing service
 */

/**
 * @swagger
 * /admin/mtxi/analytics/ride/{driverId}:
 *   get:
 *     summary: Retrieve ride completion analytics for a driver
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     responses:
 *       200:
 *         description: Ride analytics retrieved successfully
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
 *                   example: Ride completion analytics retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     totalRides:
 *                       type: integer
 *                     completedRides:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                     cancelledRides:
 *                       type: integer
 *                     cancellationRate:
 *                       type: number
 *       400:
 *         description: Invalid driver ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver or rides not found
 */
router.get(
  '/ride/:driverId',
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsMiddleware.validateGetRideAnalytics,
  analyticsController.getRideAnalytics
);

/**
 * @swagger
 * /admin/mtxi/analytics/tip/{driverId}:
 *   get:
 *     summary: Retrieve tip distribution analytics for a driver
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     responses:
 *       200:
 *         description: Tip analytics retrieved successfully
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
 *                   example: Tip distribution analytics retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     totalTips:
 *                       type: integer
 *                     totalTipAmount:
 *                       type: number
 *                     averageTip:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid driver ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver or tips not found
 */
router.get(
  '/tip/:driverId',
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsMiddleware.validateGetTipAnalytics,
  analyticsController.getTipAnalytics
);

/**
 * @swagger
 * /admin/mtxi/analytics/report/{driverId}:
 *   get:
 *     summary: Export ride reports for a driver
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, csv, json]
 *           default: json
 *         description: Report format
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *         description: Report period
 *     responses:
 *       200:
 *         description: Ride report generated successfully
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
 *                   example: Ride report generated
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     period:
 *                       type: string
 *                     format:
 *                       type: string
 *                     totalRides:
 *                       type: integer
 *                     totalEarnings:
 *                       type: number
 *                     totalDistance:
 *                       type: number
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rideId:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           distance:
 *                             type: number
 *                           duration:
 *                             type: number
 *                           earnings:
 *                             type: number
 *                           date:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid driver ID, format, or period
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver or rides not found
 */
router.get(
  '/report/:driverId',
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsMiddleware.validateExportRideReports,
  analyticsController.exportRideReports
);

/**
 * @swagger
 * /admin/mtxi/analytics/performance/{driverId}:
 *   get:
 *     summary: Analyze driver performance metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     responses:
 *       200:
 *         description: Driver performance analyzed successfully
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
 *                   example: Driver performance updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     totalRides:
 *                       type: integer
 *                     totalEarnings:
 *                       type: number
 *                     totalDistance:
 *                       type: number
 *                     totalTips:
 *                       type: integer
 *                     totalTipAmount:
 *                       type: number
 *                     averageRideDuration:
 *                       type: number
 *                     rating:
 *                       type: number
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid driver ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver not found
 */
router.get(
  '/performance/:driverId',
  analyticsMiddleware.checkAnalyticsPermission,
  analyticsMiddleware.validateAnalyzeDriverPerformance,
  analyticsController.analyzeDriverPerformance
);

module.exports = router;