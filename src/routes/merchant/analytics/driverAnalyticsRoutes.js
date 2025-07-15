'use strict';

const express = require('express');
const router = express.Router();
const driverAnalyticsController = require('@controllers/merchant/analytics/driverAnalyticsController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const driverAnalyticsValidator = require('@validators/merchant\analytics\driverAnalyticsValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_analytics'));

/**
 * @swagger
 * /merchant/analytics/drivers/{driverId}/metrics:
 *   get:
 *     summary: Monitor driver delivery metrics
 *     tags: [Driver Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver metrics monitored successfully
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
 *                     driverId:
 *                       type: string
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         avgDeliveryTime:
 *                           type: string
 *                         avgRating:
 *                           type: string
 *                         totalDeliveries:
 *                           type: integer
 *                         totalDistance:
 *                           type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid driver ID
 *       404:
 *         description: Driver not found
 */
router.get('/:driverId/metrics', driverAnalyticsValidator.validateMonitorDriverMetrics, driverAnalyticsController.monitorDriverMetrics);

/**
 * @swagger
 * /merchant/analytics/drivers/{driverId}/reports:
 *   get:
 *     summary: Generate driver performance report
 *     tags: [Driver Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver report generated successfully
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
 *                     driverId:
 *                       type: string
 *                     report:
 *                       type: object
 *                       properties:
 *                         driverName:
 *                           type: string
 *                         totalDeliveries:
 *                           type: integer
 *                         avgRating:
 *                           type: string
 *                         totalDistance:
 *                           type: string
 *                         avgDeliveryTime:
 *                           type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid driver ID
 *       404:
 *         description: Driver not found
 */
router.get('/:driverId/reports', driverAnalyticsValidator.validateGenerateDriverReports, driverAnalyticsController.generateDriverReports);

/**
 * @swagger
 * /merchant/analytics/drivers/{driverId}/feedback:
 *   post:
 *     summary: Provide driver performance feedback
 *     tags: [Driver Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedback:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     description: Feedback message
 *     responses:
 *       200:
 *         description: Feedback provided successfully
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
 *                     driverId:
 *                       type: string
 *                     feedback:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid driver ID or feedback
 *       404:
 *         description: Driver not found
 */
router.post('/:driverId/feedback', driverAnalyticsValidator.validateProvideDriverFeedback, driverAnalyticsController.provideDriverFeedback);

module.exports = router;