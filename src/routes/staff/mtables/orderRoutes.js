// orderRoutes.js
// API routes for staff mtables order operations.

'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/staff/mtables/orderController');
const orderMiddleware = require('@middleware/staff/mtables/orderMiddleware');

/**
 * @swagger
 * /staff/mtables/extra-order:
 *   post:
 *     summary: Process extra dine-in order
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - items
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     customization:
 *                       type: string
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Extra order processed successfully
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
 *                     order_number:
 *                       type: string
 *                     status:
 *                       type: string
 *                     total_amount:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/extra-order', orderMiddleware.validateProcessExtraOrder, orderController.processExtraOrder);

/**
 * @swagger
 * /staff/mtables/prepare-order:
 *   post:
 *     summary: Prepare dine-in order
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - items
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     customization:
 *                       type: string
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Order preparation started successfully
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
 *                     preparation_status:
 *                       type: string
 *                     updated_at:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/prepare-order', orderMiddleware.validatePrepareDineInOrder, orderController.prepareDineInOrder);

/**
 * @swagger
 * /staff/mtables/order-metrics:
 *   post:
 *     summary: Log order metrics for gamification
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Order metrics logged successfully
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
 *                   type: null
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/order-metrics', orderMiddleware.validateLogOrderMetrics, orderController.logOrderMetrics);

module.exports = router;