// supplyRoutes.js
// API routes for staff mtables supply operations.

'use strict';

const express = require('express');
const router = express.Router();
const supplyController = require('@controllers/staff/mtables/supplyController');
const supplyMiddleware = require('@middleware/staff/mtables/supplyMiddleware');

/**
 * @swagger
 * /staff/mtables/monitor-supplies:
 *   post:
 *     summary: Monitor dining supplies
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *     responses:
 *       200:
 *         description: Supplies monitored successfully
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
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       minimum_stock_level:
 *                         type: number
 *                       alert:
 *                         type: boolean
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/monitor-supplies', supplyMiddleware.validateMonitorSupplies, supplyController.monitorSupplies);

/**
 * @swagger
 * /staff/mtables/request-restock:
 *   post:
 *     summary: Send restocking alerts
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - staffId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Restock requested successfully
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
 *                     itemCount:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/request-restock', supplyMiddleware.validateRequestRestock, supplyController.requestRestock);

/**
 * @swagger
 * /staff/mtables/log-readiness:
 *   post:
 *     summary: Record supply readiness status
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - staffId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Supply readiness logged successfully
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
 *                     branch_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     checked_by:
 *                       type: integer
 *                     checked_at:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/log-readiness', supplyMiddleware.validateLogSupplyReadiness, supplyController.logSupplyReadiness);

module.exports = router;