'use strict';

const express = require('express');
const router = express.Router();
const staffPerformanceController = require('@controllers/merchant/analytics/staffPerformanceController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const staffPerformanceValidator = require('@validators/merchant/analytics/staffPerformanceValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_analytics'));

/**
 * @swagger
 * /merchant/analytics/staff/{staffId}/metrics:
 *   get:
 *     summary: Monitor staff performance metrics
 *     tags: [Staff Performance Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff metrics monitored successfully
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
 *                     staffId:
 *                       type: string
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         avgPrepTime:
 *                           type: string
 *                         avgRating:
 *                           type: string
 *                         tasksCompleted:
 *                           type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid staff ID
 *       404:
 *         description: Staff not found
 */
router.get('/:staffId/metrics', staffPerformanceValidator.validateMonitorStaffMetrics, staffPerformanceController.monitorStaffMetrics);

/**
 * @swagger
 * /merchant/analytics/staff/{staffId}/reports:
 *   get:
 *     summary: Generate staff performance report
 *     tags: [Staff Performance Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff performance report generated successfully
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
 *                     staffId:
 *                       type: string
 *                     report:
 *                       type: object
 *                       properties:
 *                         staffName:
 *                           type: string
 *                         branchName:
 *                           type: string
 *                         totalTasks:
 *                           type: integer
 *                         avgRating:
 *                           type: string
 *                         taskBreakdown:
 *                           type: object
 *                           properties:
 *                             orders:
 *                               type: integer
 *                             inDiningOrders:
 *                               type: integer
 *                             bookings:
 *                               type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid staff ID
 *       404:
 *         description: Staff not found
 */
router.get('/:staffId/reports', staffPerformanceValidator.validateGeneratePerformanceReports, staffPerformanceController.generatePerformanceReports);

/**
 * @swagger
 * /merchant/analytics/staff/{staffId}/feedback:
 *   post:
 *     summary: Provide feedback to staff
 *     tags: [Staff Performance Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
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
 *                     staffId:
 *                       type: string
 *                     feedback:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid staff ID or feedback
 *       404:
 *         description: Staff not found
 */
router.post('/:staffId/feedback', staffPerformanceValidator.validateProvideFeedback, staffPerformanceController.provideFeedback);

module.exports = router;