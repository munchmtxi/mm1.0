// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\staff\performanceRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const performanceController = require('@controllers/merchant/staff/performanceController');
const performanceValidator = require('@validators/merchant/staff/performanceValidator');
const performanceMiddleware = require('@middleware/merchant/staff/performanceMiddleware');

/**
 * @swagger
 * /api/merchant/staff/performance/{staffId}/metrics:
 *   post:
 *     summary: Monitor staff performance metrics
 *     tags: [Staff Performance]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metricType:
 *                 type: string
 *                 enum: [task_completion_rate, prep_time, customer_satisfaction, inventory_accuracy, checkout_speed, delivery_performance]
 *               value:
 *                 type: number
 *     responses:
 *       200:
 *         description: Metric recorded successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/metrics',
  performanceValidator.monitorMetricsValidation,
  performanceMiddleware.validateRequest,
  performanceController.monitorMetrics,
);

/**
 * @swagger
 * /api/merchant/staff/performance/{staffId}/reports:
 *   post:
 *     summary: Generate performance reports
 *     tags: [Staff Performance]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [weekly, monthly, yearly]
 *               format:
 *                 type: string
 *                 enum: [pdf, csv, json]
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/reports',
  performanceValidator.generatePerformanceReportsValidation,
  performanceMiddleware.validateRequest,
  performanceController.generatePerformanceReports,
);

/**
 * @swagger
 * /api/merchant/staff/performance/{staffId}/training:
 *   post:
 *     summary: Distribute training materials
 *     tags: [Staff Performance]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [customer_service, food_safety, financial, operational, driver_training]
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Training distributed successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/training',
  performanceValidator.distributeTrainingValidation,
  performanceMiddleware.validateRequest,
  performanceController.distributeTraining,
);

module.exports = router;