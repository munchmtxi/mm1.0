// preOrderRoutes.js
// API routes for staff mtables pre-order operations.

'use strict';

const express = require('express');
const router = express.Router();
const preOrderController = require('@controllers/staff/mtables/preOrderController');
const preOrderMiddleware = require('@middleware/staff/mtables/preOrderMiddleware');

/**
 * @swagger
 * /staff/mtables/pre-order:
 *   post:
 *     summary: Process pre-order details
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
 *         description: Pre-order processed successfully
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
router.post('/pre-order', preOrderMiddleware.validateProcessPreOrder, preOrderController.processPreOrder);

/**
 * @swagger
 * /staff/mtables/prepare-pre-order:
 *   post:
 *     summary: Prepare pre-ordered food
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
 *         description: Pre-order preparation started successfully
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
router.post('/prepare-pre-order', preOrderMiddleware.validatePreparePreOrderedFood, preOrderController.preparePreOrderedFood);

/**
 * @swagger
 * /staff/mtables/pre-order-status:
 *   post:
 *     summary: Notify customers of pre-order status
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - status
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               status:
 *                 type: string
 *                 description: Pre-order status
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Pre-order status notified successfully
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
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/pre-order-status', preOrderMiddleware.validateNotifyPreOrderStatus, preOrderController.notifyPreOrderStatus);

module.exports = router;