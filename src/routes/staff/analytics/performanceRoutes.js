// performanceRoutes.js
// API routes for staff performance analytics operations.

'use strict';

const express = require('express');
const router = express.Router();
const performanceController = require('@controllers/staff/analytics/performanceController');
const performanceMiddleware = require('@middleware/staff/analytics/performanceMiddleware');

/**
 * @swagger
 * /staff/analytics/track:
 *   post:
 *     summary: Track performance metrics for a staff member
 *     tags: [Staff Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Performance metrics tracked successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       value:
 *                         type: number
 *                       recorded_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/track', performanceMiddleware.validateTrackPerformanceMetrics, performanceController.trackPerformanceMetrics);

/**
 * @swagger
 * /staff/analytics/report:
 *   post:
 *     summary: Generate a performance report for a staff member
 *     tags: [Staff Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Performance report generated successfully
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
 *                     id:
 *                       type: integer
 *                     report_type:
 *                       type: string
 *                     data:
 *                       type: object
 *                     generated_by:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/report', performanceMiddleware.validateGeneratePerformanceReport, performanceController.generatePerformanceReport);

/**
 * @swagger
 * /staff/analytics/training:
 *   post:
 *     summary: Evaluate training impact for a staff member
 *     tags: [Staff Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Training impact evaluated successfully
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
 *                     staffId:
 *                       type: integer
 *                     trainingsCompleted:
 *                       type: integer
 *                     performanceChange:
 *                       type: object
 *                       properties:
 *                         improvement:
 *                           type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/training', performanceMiddleware.validateEvaluateTrainingImpact, performanceController.evaluateTrainingImpact);

module.exports = router;