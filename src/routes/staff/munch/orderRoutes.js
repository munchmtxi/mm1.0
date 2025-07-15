// orderRoutes.js
// API routes for staff munch order operations.

'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('@controllers/staff/munch/orderController');
const orderMiddleware = require('@middleware/staff/munch/orderMiddleware');

/**
 * @swagger
 * /staff/munch/confirm-takeaway:
 *   post:
 *     summary: Confirm takeaway order
 *     tags: [Staff Munch]
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
 *         description: Takeaway order confirmed successfully
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
router.post('/confirm-takeaway', orderMiddleware.validateConfirmTakeawayOrder, orderController.confirmTakeawayOrder);

/**
 * @swagger
 * /staff/munch/prepare-food:
 *   post:
 *     summary: Prepare food for delivery
 *     tags: [Staff Munch]
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
 *                   required:
 *                     - menu_item_id
 *                     - quantity
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                       description: Menu item ID
 *                     quantity:
 *                       type: integer
 *                       description: Quantity
 *                     customization:
 *                       type: string
 *                       description: Customization details
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Food preparation started successfully
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
router.post('/prepare-food', orderMiddleware.validatePrepareDeliveryFood, orderController.prepareDeliveryFood);

/**
 * @swagger
 * /staff/munch/log-completion:
 *   post:
 *     summary: Log order completion
 *     tags: [Staff Munch]
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
 *         description: Order completion logged successfully
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
router.post('/log-completion', orderMiddleware.validateLogOrderCompletion, orderController.logOrderCompletion);

module.exports = router;